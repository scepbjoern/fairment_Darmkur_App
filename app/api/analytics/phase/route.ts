import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SYMPTOMS = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
] as const

type SymptomKey = typeof SYMPTOMS[number]

type PhaseKey = 'PHASE_1' | 'PHASE_2' | 'PHASE_3'

function toYmd(d: Date): string {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const phaseParam = (url.searchParams.get('phase') || 'PHASE_1').toUpperCase()
    const phase: PhaseKey = (['PHASE_1', 'PHASE_2', 'PHASE_3'] as const).includes(phaseParam as PhaseKey)
      ? (phaseParam as PhaseKey)
      : 'PHASE_1'

    // Resolve user (cookie -> demo fallback)
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // All day entries for this user & phase
    const dayEntries = await prisma.dayEntry.findMany({
      where: { userId: user.id, phase },
      select: { id: true, date: true },
      orderBy: { date: 'asc' },
    })

    const dayIds = dayEntries.map(d => d.id)
    const dates = dayEntries.map(d => toYmd(d.date))

    // Load related rows
    const [symptomRows, stoolRows, tickRows, activeHabitsCount] = await Promise.all([
      dayIds.length
        ? prisma.symptomScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, type: true, score: true } })
        : Promise.resolve([] as { dayEntryId: string; type: SymptomKey; score: number }[]),
      dayIds.length
        ? prisma.stoolScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, bristol: true } })
        : Promise.resolve([] as { dayEntryId: string; bristol: number }[]),
      dayIds.length
        ? prisma.habitTick.findMany({ where: { dayEntryId: { in: dayIds }, checked: true }, select: { dayEntryId: true } })
        : Promise.resolve([] as { dayEntryId: string }[]),
      prisma.habit.count({ where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] } }),
    ])

    // Indexing helpers
    const dayKeyById = new Map<string, string>()
    const dayIdByKey = new Map<string, string>()
    for (let i = 0; i < dayEntries.length; i++) {
      const key = dates[i]
      const id = dayEntries[i].id
      dayKeyById.set(id, key)
      dayIdByKey.set(key, id)
    }

    // Aggregate metrics per symptom
    const symptomMetrics: Record<SymptomKey, { avg: number | null; min: number | null; max: number | null }> = {
      BESCHWERDEFREIHEIT: { avg: null, min: null, max: null },
      ENERGIE: { avg: null, min: null, max: null },
      STIMMUNG: { avg: null, min: null, max: null },
      SCHLAF: { avg: null, min: null, max: null },
      ENTSPANNUNG: { avg: null, min: null, max: null },
      HEISSHUNGERFREIHEIT: { avg: null, min: null, max: null },
      BEWEGUNG: { avg: null, min: null, max: null },
    }

    const byType: Record<SymptomKey, number[]> = {
      BESCHWERDEFREIHEIT: [],
      ENERGIE: [],
      STIMMUNG: [],
      SCHLAF: [],
      ENTSPANNUNG: [],
      HEISSHUNGERFREIHEIT: [],
      BEWEGUNG: [],
    }

    for (const r of symptomRows) {
      const t = r.type as SymptomKey
      if (SYMPTOMS.includes(t)) byType[t].push(r.score)
    }

    for (const t of SYMPTOMS) {
      const arr = byType[t]
      if (arr.length) {
        const sum = arr.reduce((a, b) => a + b, 0)
        symptomMetrics[t].avg = Number((sum / arr.length).toFixed(2))
        symptomMetrics[t].min = Math.min(...arr)
        symptomMetrics[t].max = Math.max(...arr)
      }
    }

    // Stool avg
    let stoolAvg: number | null = null
    if (stoolRows.length) {
      const sum = stoolRows.reduce((a, b) => a + b.bristol, 0)
      stoolAvg = Number((sum / stoolRows.length).toFixed(2))
    }

    // Series per day
    const wellBeingIndex: (number | null)[] = []
    const stoolSeries: (number | null)[] = []
    const habitFulfillment: (number | null)[] = []
    const symptomSeries: Record<SymptomKey, (number | null)[]> = {
      BESCHWERDEFREIHEIT: [],
      ENERGIE: [],
      STIMMUNG: [],
      SCHLAF: [],
      ENTSPANNUNG: [],
      HEISSHUNGERFREIHEIT: [],
      BEWEGUNG: [],
    }

    // Precompute per-day symptom lists
    const symptomsByDay: Record<string, number[]> = {}
    const perTypeByKey = new Map<SymptomKey, Map<string, number>>()
    for (const t of SYMPTOMS) perTypeByKey.set(t, new Map())
    for (const r of symptomRows) {
      const key = dayKeyById.get(r.dayEntryId)
      if (!key) continue
      ;(symptomsByDay[key] ||= []).push(r.score)
      const t = r.type as SymptomKey
      perTypeByKey.get(t)?.set(key, r.score)
    }

    const stoolByDayId = new Map<string, number>()
    for (const r of stoolRows) stoolByDayId.set(r.dayEntryId, r.bristol)

    const doneByDayId = new Map<string, number>()
    for (const r of tickRows) doneByDayId.set(r.dayEntryId, (doneByDayId.get(r.dayEntryId) || 0) + 1)

    for (const key of dates) {
      const dayId = dayIdByKey.get(key)
      // Index
      const vals = symptomsByDay[key]
      if (vals && vals.length) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        wellBeingIndex.push(Number(avg.toFixed(2)))
      } else {
        wellBeingIndex.push(null)
      }
      // Per-symptom series
      for (const t of SYMPTOMS) {
        symptomSeries[t].push(perTypeByKey.get(t)?.get(key) ?? null)
      }
      // Stool
      stoolSeries.push(dayId ? stoolByDayId.get(dayId) ?? null : null)
      // Habits
      if (activeHabitsCount > 0 && dayId) {
        const done = doneByDayId.get(dayId) || 0
        habitFulfillment.push(Number((done / activeHabitsCount).toFixed(3)))
      } else {
        habitFulfillment.push(null)
      }
    }

    // Habit fulfillment avg
    let habitAvg: number | null = null
    const hfVals = habitFulfillment.filter((v): v is number => typeof v === 'number')
    if (hfVals.length) habitAvg = Number((hfVals.reduce((a, b) => a + b, 0) / hfVals.length).toFixed(3))

    const payload = {
      phase,
      metrics: {
        symptoms: symptomMetrics,
        stool: { avg: stoolAvg },
        habitFulfillment: { avg: habitAvg },
      },
      series: {
        dates,
        wellBeingIndex,
        stool: stoolSeries,
        habitFulfillment,
        symptoms: symptomSeries,
      },
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/phase failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
