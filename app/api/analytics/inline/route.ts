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

function fromYmd(s: string | null): Date | null {
  if (!s) return null
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo, d))
  // Normalize to local date (strip time by constructing local date)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const toParam = url.searchParams.get('to')

    // Resolve user (cookie -> demo fallback)
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    // Determine 7-day window ending at 'to' (inclusive)
    let toDate = fromYmd(toParam)
    if (!toDate) toDate = new Date()
    const endInclusive = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
    const startInclusive = new Date(endInclusive)
    startInclusive.setDate(startInclusive.getDate() - 6)

    // Keys array from start..end inclusive
    const days: Date[] = []
    const keys: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startInclusive)
      d.setDate(d.getDate() + i)
      days.push(d)
      keys.push(toYmd(d))
    }

    const rangeStart = new Date(startInclusive)
    const rangeEndExclusive = new Date(endInclusive)
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1)

    // Load day entries in range
    const dayEntries = await prisma.dayEntry.findMany({
      where: { userId: user.id, date: { gte: rangeStart, lt: rangeEndExclusive } },
      select: { id: true, date: true },
    })

    const dayKeyById = new Map<string, string>()
    const dayIdByKey = new Map<string, string>()
    for (const de of dayEntries) {
      const key = toYmd(de.date)
      dayKeyById.set(de.id, key)
      dayIdByKey.set(key, de.id)
    }
    const dayIds = dayEntries.map(d => d.id)

    // Load related rows
    const [symptomRows, stoolRows, customDefs, customScores] = await Promise.all([
      dayIds.length
        ? prisma.symptomScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, type: true, score: true } })
        : Promise.resolve([] as { dayEntryId: string; type: SymptomKey; score: number }[]),
      dayIds.length
        ? prisma.stoolScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, bristol: true } })
        : Promise.resolve([] as { dayEntryId: string; bristol: number }[]),
      (prisma as any).userSymptom.findMany({ where: { userId: user.id, isActive: true }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } }),
      dayIds.length
        ? (prisma as any).userSymptomScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, userSymptomId: true, score: true } })
        : Promise.resolve([] as { dayEntryId: string; userSymptomId: string; score: number }[]),
    ])

    // Build per-type map for standard symptoms
    const perTypeByKey = new Map<SymptomKey, Map<string, number>>()
    for (const t of SYMPTOMS) perTypeByKey.set(t, new Map())
    for (const r of symptomRows) {
      const key = dayKeyById.get(r.dayEntryId)
      if (!key) continue
      const t = r.type as SymptomKey
      perTypeByKey.get(t)?.set(key, r.score)
    }
    const symptoms: Record<SymptomKey, (number | null)[]> = {
      BESCHWERDEFREIHEIT: [],
      ENERGIE: [],
      STIMMUNG: [],
      SCHLAF: [],
      ENTSPANNUNG: [],
      HEISSHUNGERFREIHEIT: [],
      BEWEGUNG: [],
    }
    for (const key of keys) {
      for (const t of SYMPTOMS) symptoms[t].push(perTypeByKey.get(t)?.get(key) ?? null)
    }

    // Custom symptom series
    const customById: Record<string, Map<string, number>> = {}
    for (const def of customDefs as any[]) customById[def.id] = new Map<string, number>()
    for (const r of customScores as any[]) {
      const key = dayKeyById.get(r.dayEntryId)
      if (!key) continue
      customById[r.userSymptomId]?.set(key, r.score)
    }

    const collator = new Intl.Collator('de-DE', { sensitivity: 'base' })
    const sortedDefs = (customDefs as any[]).slice().sort((a: any, b: any) => collator.compare(a.title, b.title))

    // Stool series
    const stoolByDayId = new Map<string, number>()
    for (const r of stoolRows) stoolByDayId.set(r.dayEntryId, r.bristol)
    const stool: (number | null)[] = keys.map(k => {
      const id = dayIdByKey.get(k)
      return id ? (stoolByDayId.get(id) ?? null) : null
    })

    // Yesterday values (relative to 'to')
    const yest = new Date(endInclusive)
    yest.setDate(yest.getDate() - 1)
    const yKey = toYmd(yest)
    const yId = dayIdByKey.get(yKey)
    let yesterdayHabits: string[] = []
    if (yId) {
      const habitTicks = await prisma.habitTick.findMany({ where: { dayEntryId: yId, checked: true }, select: { habitId: true } })
      yesterdayHabits = habitTicks.map(r => r.habitId)
    }
    const yesterday = {
      standard: Object.fromEntries(SYMPTOMS.map(t => [t, perTypeByKey.get(t)?.get(yKey) ?? null])) as Record<SymptomKey, number | null>,
      custom: Object.fromEntries(sortedDefs.map((d: any) => [d.id, customById[d.id]?.get(yKey) ?? null])) as Record<string, number | null>,
      stool: yId ? (stoolByDayId.get(yId) ?? null) : null,
      habits: yesterdayHabits,
    }

    const payload = {
      days: keys,
      symptoms,
      stool,
      customSymptoms: {
        defs: sortedDefs.map((d: any) => ({ id: d.id, title: d.title })),
        series: Object.fromEntries(sortedDefs.map((d: any) => [d.id, keys.map(k => customById[d.id]?.get(k) ?? null)])),
      },
      yesterday,
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/inline failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
