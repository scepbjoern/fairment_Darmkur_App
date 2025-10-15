import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { DEFAULT_HABIT_ICONS, DEFAULT_SYMPTOM_ICONS } from '@/lib/default-icons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local enums to avoid build-time dependency on generated Prisma enums
const _Phases = ['PHASE_1', 'PHASE_2', 'PHASE_3'] as const
export type Phase = typeof _Phases[number]
const _CareCategories = ['SANFT', 'MEDIUM', 'INTENSIV'] as const
export type CareCategory = typeof _CareCategories[number]
const _NoteTypes = ['MEAL', 'REFLECTION'] as const
export type NoteType = typeof _NoteTypes[number]

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') ?? toYmdLocal(new Date())
  const { start, end } = getDayRange(dateStr)

  // Resolve user by cookie; fallback to demo user
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })
  }

  // Ensure DayEntry exists for the date
  let day = await prisma.dayEntry.findFirst({ where: { userId: user.id, date: { gte: start, lt: end } } })
  if (!day) {
    const prev = await prisma.dayEntry.findFirst({
      where: { userId: user.id, date: { lt: start } },
      orderBy: { date: 'desc' },
      select: { careCategory: true, phase: true },
    })
    day = await prisma.dayEntry.create({
      data: {
        userId: user.id,
        date: start,
        phase: (prev?.phase ?? 'PHASE_1') as Phase,
        careCategory: (prev?.careCategory ?? 'SANFT') as CareCategory,
      },
    })
  }

  // Load habits (standard + user)
  const _habits = await (prisma as any).habit.findMany({
    where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] },
    orderBy: { sortIndex: 'asc' },
    select: { id: true, title: true, userId: true, icon: true },
  })
  // Resolve per-user overrides for standard-habit icons
  const overrides = await (prisma as any).habitIcon.findMany({ where: { userId: user.id, habitId: { in: _habits.map((h: any) => h.id) } } })
  const iconByHabit = new Map<string, string | null>(overrides.map((o: any) => [o.habitId, o.icon ?? null]))
  const habits = (_habits as any[]).map((h: any) => {
    let icon: string | null
    if (h.userId) {
      icon = h.icon ?? null
    } else if (iconByHabit.has(h.id)) {
      // respect explicit per-user override, including null (cleared)
      icon = iconByHabit.get(h.id) ?? null
    } else {
      icon = DEFAULT_HABIT_ICONS[h.title] ?? null
    }
    return { id: h.id, title: h.title, userId: h.userId, icon }
  })

  // Load symptom scores
  const symptomRows = await prisma.symptomScore.findMany({ where: { dayEntryId: day.id } })
  const symptoms: Record<string, number | undefined> = {}
  for (const s of symptomRows) symptoms[s.type] = s.score

  // Load stool
  const stoolRow = await prisma.stoolScore.findUnique({ where: { dayEntryId: day.id } })

  // Load ticks
  const tickRows: { habitId: string; checked: boolean }[] = await prisma.habitTick.findMany({ where: { dayEntryId: day.id } })
  const ticks = habits.map((h: { id: string }) => {
    const t = tickRows.find((x: { habitId: string; checked: boolean }) => x.habitId === h.id)
    return { habitId: h.id, checked: Boolean(t?.checked) }
  })

  // Load notes incl. tech capture time and photos
  const noteRows = await prisma.dayNote.findMany({
    where: { dayEntryId: day.id },
    orderBy: { occurredAt: 'asc' },
    include: { photos: true },
  })
  const notes = noteRows.map((n: any) => ({
    id: n.id,
    dayId: n.dayEntryId,
    type: (n.type as unknown as NoteType),
    time: n.occurredAt?.toISOString().slice(11, 16),
    techTime: n.createdAt?.toISOString().slice(11, 16),
    occurredAtIso: n.occurredAt?.toISOString(),
    createdAtIso: n.createdAt?.toISOString(),
    text: n.text ?? '',
    photos: (n.photos || []).map((p: any) => ({ id: p.id, url: p.url })),
  }))
  // Load user-defined symptoms and their scores for this day
  const userSyms = await (prisma as any).userSymptom.findMany({ where: { userId: user.id, isActive: true }, orderBy: { sortIndex: 'asc' } })
  const userScores = await (prisma as any).userSymptomScore.findMany({ where: { dayEntryId: day.id } })
  const scoreById = new Map<string, number>()
  for (const r of userScores) scoreById.set(r.userSymptomId, r.score)
  const userSymptoms = (userSyms as any[]).map((u: any) => ({ id: u.id, title: u.title, icon: u.icon ?? null, score: scoreById.get(u.id) }))

  // Load per-user icons for standard symptoms
  const symIconRows = await (prisma as any).symptomIcon.findMany({ where: { userId: user.id } })
  // Start with defaults, then apply user overrides (including explicit clearing to null)
  const symptomIcons: Record<string, string | null> = { ...DEFAULT_SYMPTOM_ICONS }
  for (const r of symIconRows as any[]) symptomIcons[r.type] = r.icon ?? null

  const payload = {
    day: {
      id: day.id,
      date: dateStr,
      phase: day.phase,
      careCategory: day.careCategory,
      notes: day.notes ?? '',
      symptoms,
      stool: stoolRow?.bristol ?? undefined,
      habitTicks: ticks,
      userSymptoms,
    },
    habits,
    notes,
    symptomIcons,
  }

  return NextResponse.json(payload)
}

function getDayRange(ymd: string) {
  const [y, m, d] = ymd.split('-').map((n: string) => parseInt(n, 10))
  const start = new Date(y, (m || 1) - 1, d || 1)
  const end = new Date(y, (m || 1) - 1, (d || 1) + 1)
  return { start, end }
}

function toYmdLocal(d: Date) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
