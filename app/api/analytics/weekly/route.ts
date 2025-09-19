import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Symptom enum names from Prisma schema
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

function startOfWeekLocal(d: Date, weekStart: 'mon' | 'sun'): Date {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = dt.getDay() // 0=Sun..6=Sat
  const offset = weekStart === 'sun' ? day : (day === 0 ? 6 : day - 1) // days since week start
  dt.setDate(dt.getDate() - offset)
  return dt
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const fromParam = url.searchParams.get('from')

    // Resolve user (cookie -> demo fallback)
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId }, include: { settings: true } })
      : null
    if (!user) {
      user = await prisma.user.findUnique({ where: { username: 'demo' }, include: { settings: true } })
    }
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const weekStartPref: 'mon' | 'sun' = user.settings?.weekStart === 'sun' ? 'sun' : 'mon'

    let start = fromYmd(fromParam)
    if (!start) start = startOfWeekLocal(new Date(), weekStartPref)

    // Build the 7-day window
    const days: Date[] = []
    const keys: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push(d)
      keys.push(toYmd(d))
    }

    const rangeStart = new Date(days[0])
    const rangeEndExclusive = new Date(days[6])
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1)

    // Load day entries in range
    const dayEntries = await prisma.dayEntry.findMany({
      where: {
        userId: user.id,
        date: { gte: rangeStart, lt: rangeEndExclusive },
      },
      select: { id: true, date: true },
    })

    const dayIdByKey = new Map<string, string>()
    const dayKeyById = new Map<string, string>()
    for (const de of dayEntries) {
      const key = toYmd(de.date)
      dayIdByKey.set(key, de.id)
      dayKeyById.set(de.id, key)
    }
    const dayIds = dayEntries.map((d: { id: string; date: Date }) => d.id)

    // Load symptoms, stool, ticks
    const [symptomRows, stoolRows, tickRows, activeHabitsCount, customDefs, customScores] = await Promise.all([
      dayIds.length
        ? prisma.symptomScore.findMany({
            where: { dayEntryId: { in: dayIds } },
            select: { dayEntryId: true, type: true, score: true },
          })
        : Promise.resolve([] as { dayEntryId: string; type: SymptomKey; score: number }[]),
      dayIds.length
        ? prisma.stoolScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, bristol: true } })
        : Promise.resolve([] as { dayEntryId: string; bristol: number }[]),
      dayIds.length
        ? prisma.habitTick.findMany({ where: { dayEntryId: { in: dayIds }, checked: true }, select: { dayEntryId: true } })
        : Promise.resolve([] as { dayEntryId: string }[]),
      prisma.habit.count({ where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] } }),
      (prisma as any).userSymptom.findMany({ where: { userId: user.id, isActive: true }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } }),
      dayIds.length
        ? (prisma as any).userSymptomScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, userSymptomId: true, score: true } })
        : Promise.resolve([] as { dayEntryId: string; userSymptomId: string; score: number }[]),
    ])

    // Map stool per day
    const stoolByDayId = new Map<string, number>()
    for (const r of stoolRows) stoolByDayId.set(r.dayEntryId, r.bristol)

    // Map done ticks per day
    const doneByDayId = new Map<string, number>()
    for (const r of tickRows) doneByDayId.set(r.dayEntryId, (doneByDayId.get(r.dayEntryId) || 0) + 1)

    // Symptoms map: type -> (dayKey -> score)
    const symptomByTypeByKey = new Map<SymptomKey, Map<string, number>>()
    for (const t of SYMPTOMS) symptomByTypeByKey.set(t, new Map())
    for (const r of symptomRows) {
      const key = dayKeyById.get(r.dayEntryId)
      if (!key) continue
      const m = symptomByTypeByKey.get(r.type as SymptomKey)
      if (m) m.set(key, r.score)
    }

    // Build arrays
    const symptoms: Record<SymptomKey, (number | null)[]> = {
      BESCHWERDEFREIHEIT: [],
      ENERGIE: [],
      STIMMUNG: [],
      SCHLAF: [],
      ENTSPANNUNG: [],
      HEISSHUNGERFREIHEIT: [],
      BEWEGUNG: [],
    }

    const stool: (number | null)[] = []
    const habitFulfillment: (number | null)[] = []
    // Custom symptoms series: id -> (dayKey -> score)
    const customById: Record<string, Map<string, number>> = {}
    for (const def of customDefs as any[]) customById[def.id] = new Map<string, number>()
    for (const r of customScores as any[]) {
      const key = dayKeyById.get(r.dayEntryId)
      if (!key) continue
      const m = customById[r.userSymptomId]
      if (m) m.set(key, r.score)
    }
    const wellBeingIndex: (number | null)[] = []

    for (const key of keys) {
      // Symptoms
      const dayValues: number[] = []
      for (const t of SYMPTOMS) {
        const v = symptomByTypeByKey.get(t)?.get(key)
        symptoms[t].push(v ?? null)
        if (typeof v === 'number') dayValues.push(v)
      }
      // Index
      if (dayValues.length > 0) {
        const avg = dayValues.reduce((a, b) => a + b, 0) / dayValues.length
        wellBeingIndex.push(Number(avg.toFixed(2)))
      } else {
        wellBeingIndex.push(null)
      }
      // Stool (treat 99 as "kein Stuhl" → null)
      const dayId = dayIdByKey.get(key)
      const sv = dayId ? stoolByDayId.get(dayId) ?? null : null
      stool.push(sv === 99 ? null : sv)
      // Habits
      if (activeHabitsCount > 0 && dayId) {
        const done = doneByDayId.get(dayId) || 0
        habitFulfillment.push(Number((done / activeHabitsCount).toFixed(3)))
      } else {
        habitFulfillment.push(null)
      }
    }

    const collator = new Intl.Collator('de-DE', { sensitivity: 'base' })
    const sortedDefs = (customDefs as any[]).slice().sort((a: any, b: any) => collator.compare(a.title, b.title))
    const payload = {
      weekStart: toYmd(days[0]),
      days: keys,
      symptoms,
      wellBeingIndex,
      stool,
      habitFulfillment,
      customSymptoms: {
        defs: sortedDefs.map((d: any) => ({ id: d.id, title: d.title })),
        series: Object.fromEntries(sortedDefs.map((d: any) => [d.id, keys.map((k: string) => customById[d.id]?.get(k) ?? null)])),
      },
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/analytics/weekly failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
