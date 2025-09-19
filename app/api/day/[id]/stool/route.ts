import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))
  const bristol = Number(body.bristol)
  if (!((bristol >= 1 && bristol <= 7) || bristol === 99)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.stoolScore.upsert({
    where: { dayEntryId: day.id },
    create: { dayEntryId: day.id, bristol },
    update: { bristol },
  })

  const payload = await buildDayPayload(day.id)
  return NextResponse.json({ day: payload })
}

async function buildDayPayload(dayId: string) {
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ where: { id: dayId } })
  if (!day) throw new Error('Day not found')
  const habits: { id: string; title: string }[] = await prisma.habit.findMany({ where: { isActive: true, OR: [{ userId: null }, { userId: day.userId }] }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } })
  const symptomRows = await prisma.symptomScore.findMany({ where: { dayEntryId: day.id } })
  const symptoms: Record<string, number | undefined> = {}
  for (const s of symptomRows) symptoms[s.type] = s.score
  const stoolRow = await prisma.stoolScore.findUnique({ where: { dayEntryId: day.id } })
  const tickRows: { habitId: string; checked: boolean }[] = await prisma.habitTick.findMany({ where: { dayEntryId: day.id } })
  const ticks = habits.map((h: { id: string }) => ({ habitId: h.id, checked: Boolean(tickRows.find((t: { habitId: string; checked: boolean }) => t.habitId === h.id)?.checked) }))
  // Custom user-defined symptoms
  const userSymptoms = await (prisma as any).userSymptom.findMany({ where: { userId: day.userId, isActive: true }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } })
  const scores = await (prisma as any).userSymptomScore.findMany({ where: { dayEntryId: day.id } })
  const scoreById = new Map<string, number>()
  for (const s of scores) scoreById.set(s.userSymptomId, s.score)
  const userSymptomsOut = (userSymptoms as any[]).map((u: any) => ({ id: u.id, title: u.title, score: scoreById.get(u.id) }))
  const dateStr = toYmd(day.date)
  return { id: day.id, date: dateStr, phase: day.phase, careCategory: day.careCategory, notes: day.notes ?? '', symptoms, stool: stoolRow?.bristol ?? undefined, habitTicks: ticks, userSymptoms: userSymptomsOut }
}

function toYmd(d: Date) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
