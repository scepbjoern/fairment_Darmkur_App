import { NextResponse } from 'next/server'
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

function toYmd(d: Date): string {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET() {
  try {
    // Resolve user (cookie-less context not available here; use demo fallback if needed)
    // In app router, cookies are available via headers in Request in other signatures,
    // but for simplicity we align with demo fallback if no cookie is bound.
    // Use a small trick: fetch user by demo if multiple deployments rely on it.
    // If you need strict cookie reading, switch signature to (req: NextRequest).
    let user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ dates: [], wellBeingIndex: [], stool: [], habitFulfillment: [], markers: [] })

    // All day entries sorted
    const dayEntries = await prisma.dayEntry.findMany({
      where: { userId: user.id },
      select: { id: true, date: true },
      orderBy: { date: 'asc' },
    })
    const dayIds = dayEntries.map(d => d.id)
    const dates = dayEntries.map(d => toYmd(d.date))

    const [symptomRows, stoolRows, tickRows, activeHabitsCount, reflections] = await Promise.all([
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
      stool.push(dayId ? stoolByDayId.get(dayId) ?? null : null)
      if (activeHabitsCount > 0 && dayId) {
        const done = doneByDayId.get(dayId) || 0
        habitFulfillment.push(Number((done / activeHabitsCount).toFixed(3)))
      } else {
        habitFulfillment.push(null)
      }
    }

    const markers = reflections.map(r => ({ id: r.id, date: toYmd(r.createdAt), kind: r.kind }))

    const payload = { dates, wellBeingIndex, stool, habitFulfillment, markers, symptoms: symptomSeries }
    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/overall failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
