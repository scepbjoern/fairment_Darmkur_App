import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

function toYmd(d: Date): string {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    // Resolve user from cookie; fallback to demo; if still missing, return consistent empty shapes
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) {
      const emptySymptoms = {
        BESCHWERDEFREIHEIT: [],
        ENERGIE: [],
        STIMMUNG: [],
        SCHLAF: [],
        ENTSPANNUNG: [],
        HEISSHUNGERFREIHEIT: [],
        BEWEGUNG: [],
      }
      return NextResponse.json({ dates: [], wellBeingIndex: [], stool: [], habitFulfillment: [], markers: [], symptoms: emptySymptoms })
    }

    // All day entries sorted
    const dayEntries = await prisma.dayEntry.findMany({
      where: { userId: user.id },
      select: { id: true, date: true },
      orderBy: { date: 'asc' },
    })
    const dayIds = dayEntries.map((d: { id: string; date: Date }) => d.id)
    const dates = dayEntries.map((d: { id: string; date: Date }) => toYmd(d.date))

    const [symptomRows, stoolRows, tickRows, activeHabitsCount, reflections, customDefs, customScores] = await Promise.all([
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
      prisma.reflection.findMany({ where: { userId: user.id }, select: { id: true, createdAt: true, kind: true }, orderBy: { createdAt: 'asc' } }),
      (prisma as any).userSymptom.findMany({ where: { userId: user.id, isActive: true }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } }),
      dayIds.length
        ? (prisma as any).userSymptomScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, userSymptomId: true, score: true } })
        : Promise.resolve([] as { dayEntryId: string; userSymptomId: string; score: number }[]),
    ])

    const dayKeyById = new Map<string, string>()
    const dayIdByKey = new Map<string, string>()
    for (let i = 0; i < dayEntries.length; i++) {
      const key = dates[i]
      dayKeyById.set(dayEntries[i].id, key)
      dayIdByKey.set(key, dayEntries[i].id)
    }

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

    const wellBeingIndex: (number | null)[] = []
    const stool: (number | null)[] = []
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

    for (const key of dates) {
      const dayId = dayIdByKey.get(key)
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
      const sv = dayId ? stoolByDayId.get(dayId) ?? null : null
      stool.push(sv === 99 ? null : sv)
      if (activeHabitsCount > 0 && dayId) {
        const done = doneByDayId.get(dayId) || 0
        habitFulfillment.push(Number((done / activeHabitsCount).toFixed(3)))
      } else {
        habitFulfillment.push(null)
      }
    }

    const markers = reflections.map((r: { id: string; createdAt: Date; kind: any }) => ({ id: r.id, date: toYmd(r.createdAt), kind: r.kind }))

    // Custom symptoms series keyed by custom symptom id
    const customById: Record<string, Map<string, number>> = {}
    for (const def of customDefs as any[]) customById[def.id] = new Map<string, number>()
    for (const r of customScores as any[]) {
      const key = dayKeyById.get(r.dayEntryId)
      if (!key) continue
      const m = customById[r.userSymptomId]
      if (m) m.set(key, r.score)
    }

    const collator = new Intl.Collator('de-DE', { sensitivity: 'base' })
    const sortedDefs = (customDefs as any[]).slice().sort((a: any, b: any) => collator.compare(a.title, b.title))
    const payload = {
      dates,
      wellBeingIndex,
      stool,
      habitFulfillment,
      markers,
      symptoms: symptomSeries,
      customSymptoms: {
        defs: sortedDefs.map((d: any) => ({ id: d.id, title: d.title })),
        series: Object.fromEntries(sortedDefs.map((d: any) => [d.id, dates.map((k: string) => customById[d.id]?.get(k) ?? null)])),
      },
    }
    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/overall failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
