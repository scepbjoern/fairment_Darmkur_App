import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Local enums to avoid build-time dependency on generated Prisma enums
const Phases = ['PHASE_1', 'PHASE_2', 'PHASE_3'] as const
export type Phase = typeof Phases[number]
const CareCategories = ['SANFT', 'MEDIUM', 'INTENSIV'] as const
export type CareCategory = typeof CareCategories[number]
const NoteTypes = ['MEAL', 'REFLECTION'] as const
export type NoteType = typeof NoteTypes[number]

export async function GET(req: NextRequest) {
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
      select: { careCategory: true },
    })
    day = await prisma.dayEntry.create({
      data: {
        userId: user.id,
        date: start,
        phase: 'PHASE_1',
        careCategory: (prev?.careCategory ?? 'SANFT') as CareCategory,
      },
    })
  }

  // Load habits (standard + user)
  const habits: { id: string; title: string }[] = await prisma.habit.findMany({
    where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] },
    orderBy: { sortIndex: 'asc' },
    select: { id: true, title: true },
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
    },
    habits,
    notes,
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
