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

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmdLocal(s: string): Date | null {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return new Date(y, mo, d)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')

    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const whereDate: any = {}
    const from = fromParam ? parseYmdLocal(fromParam) : null
    const to = toParam ? parseYmdLocal(toParam) : null
    if (from) whereDate.gte = from
    if (to) {
      const end = new Date(to)
      end.setDate(end.getDate() + 1) // exclusive
      whereDate.lt = end
    }

    const dayEntries = await prisma.dayEntry.findMany({
      where: { userId: user.id, ...(from || to ? { date: whereDate } : {}) },
      select: { id: true, date: true, phase: true, careCategory: true },
      orderBy: { date: 'asc' },
    })

    const dayIds = dayEntries.map(d => d.id)
    const keys = dayEntries.map(d => toYmd(d.date))
    const idByKey = new Map<string, string>()
    const keyById = new Map<string, string>()
    for (let i = 0; i < dayEntries.length; i++) {
      idByKey.set(keys[i], dayEntries[i].id)
      keyById.set(dayEntries[i].id, keys[i])
    }

    const [symptomRows, stoolRows, tickRowsAll, activeHabitsCount, ownHabits] = await Promise.all([
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
      prisma.habit.findMany({ where: { userId: user.id, isActive: true }, select: { id: true, title: true }, orderBy: { sortIndex: 'asc' } })
    ])

    const stoolById = new Map<string, number>()
    for (const r of stoolRows) stoolById.set(r.dayEntryId, r.bristol)

    const doneById = new Map<string, number>()
    for (const r of tickRowsAll) doneById.set(r.dayEntryId, (doneById.get(r.dayEntryId) || 0) + 1)

    // Build per-day own habit completion map
    const ownHabitIds = ownHabits.map(h => h.id)
    const ticksOwn = ownHabitIds.length && dayIds.length
      ? await prisma.habitTick.findMany({
          where: { dayEntryId: { in: dayIds }, habitId: { in: ownHabitIds }, checked: true },
          select: { dayEntryId: true, habitId: true },
        })
      : [] as { dayEntryId: string; habitId: string }[]
    const ownTickByDay = new Map<string, Set<string>>()
    for (const t of ticksOwn) {
      const set = ownTickByDay.get(t.dayEntryId) || new Set<string>()
      set.add(t.habitId)
      ownTickByDay.set(t.dayEntryId, set)
    }

    const byTypeByKey = new Map<SymptomKey, Map<string, number>>()
    for (const t of SYMPTOMS) byTypeByKey.set(t, new Map())
    for (const r of symptomRows) {
      const key = keyById.get(r.dayEntryId)
      if (!key) continue
      byTypeByKey.get(r.type as SymptomKey)?.set(key, r.score)
    }

    const header = [
      'date', 'phase', 'careCategory', 'wbi',
      'stool_bristol', 'habit_done', 'habits_total', 'habit_ratio',
      ...SYMPTOMS.map(s => `symptom_${s}`),
      ...ownHabits.map(h => `habit_${h.title}`),
    ]

    const rows: string[][] = [header]

    for (let i = 0; i < dayEntries.length; i++) {
      const de = dayEntries[i]
      const key = keys[i]
      const dayId = de.id

      const values: number[] = []
      const symptomsRow: (number | '')[] = []
      for (const s of SYMPTOMS) {
        const v = byTypeByKey.get(s)?.get(key)
        symptomsRow.push(typeof v === 'number' ? v : '')
        if (typeof v === 'number') values.push(v)
      }
      const wbi = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : ''
      const stool = stoolById.get(dayId)
      const done = doneById.get(dayId) || 0
      const total = activeHabitsCount
      const ratio = total > 0 ? Number((done / total).toFixed(3)) : ''

      rows.push([
        key,
        de.phase,
        de.careCategory,
        String(wbi),
        typeof stool === 'number' ? String(stool) : '',
        String(done),
        String(total),
        String(ratio),
        ...symptomsRow.map(v => String(v)),
        ...ownHabits.map(h => (ownTickByDay.get(dayId)?.has(h.id) ? '1' : '0')),
      ])
    }

    const csv = '\uFEFF' + rows.map(r => r.map(cell => {
      // simple CSV escaping if contains comma or quote
      const s = cell == null ? '' : String(cell)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }).join(',')).join('\n')

    const res = new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
    const now = new Date()
    const fname = `darmkur_export_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`
    res.headers.set('Content-Disposition', `attachment; filename="${fname}"`)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/export/csv failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
