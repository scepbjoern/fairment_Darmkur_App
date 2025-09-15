import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local enums to avoid build-time dependency on generated Prisma enums
const Phases = ['PHASE_1', 'PHASE_2', 'PHASE_3'] as const
export type Phase = typeof Phases[number]
const CareCategories = ['SANFT', 'MEDIUM', 'INTENSIV'] as const
export type CareCategory = typeof CareCategories[number]

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))

  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: { phase?: Phase; careCategory?: CareCategory; notes?: string | null } = {}
  if (body.phase) {
    if (!Phases.includes(body.phase)) return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })
    data.phase = body.phase as Phase
  }
  if (body.careCategory) {
    if (!CareCategories.includes(body.careCategory)) return NextResponse.json({ error: 'Invalid careCategory' }, { status: 400 })
    data.careCategory = body.careCategory as CareCategory
  }
  if (typeof body.notes !== 'undefined') data.notes = body.notes ?? null

  await prisma.dayEntry.update({ where: { id }, data })

  const payload = await buildDayPayload(id)
  return NextResponse.json({ day: payload })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete notes and their photos
  const notes = await prisma.dayNote.findMany({ where: { dayEntryId: day.id }, select: { id: true } })
  const noteIds = notes.map(n => n.id)
  if (noteIds.length > 0) {
    await prisma.dayNotePhoto.deleteMany({ where: { dayNoteId: { in: noteIds } } })
  }
  await prisma.dayNote.deleteMany({ where: { dayEntryId: day.id } })

  // Delete habit ticks, symptoms, stool, custom user symptom scores
  await prisma.habitTick.deleteMany({ where: { dayEntryId: day.id } })
  await prisma.symptomScore.deleteMany({ where: { dayEntryId: day.id } })
  await prisma.stoolScore.deleteMany({ where: { dayEntryId: day.id } })
  await (prisma as any).userSymptomScore.deleteMany({ where: { dayEntryId: day.id } })

  // Reset free-text notes
  await prisma.dayEntry.update({ where: { id: day.id }, data: { notes: null } })

  const payload = await buildDayPayload(day.id)
  return NextResponse.json({ day: payload })
}

async function buildDayPayload(dayId: string) {
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ where: { id: dayId } })
  if (!day) throw new Error('Day not found after update')
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
