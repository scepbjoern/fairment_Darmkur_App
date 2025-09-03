import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SymptomType } from '@prisma/client'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const type = String(body.type || '') as SymptomType
  const score = Number(body.score)
  if (!Object.values(SymptomType).includes(type) || !(score >= 1 && score <= 10)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.symptomScore.upsert({
    where: { dayEntryId_type: { dayEntryId: day.id, type } },
    create: { dayEntryId: day.id, type, score },
    update: { score },
  })

  const payload = await buildDayPayload(day.id)
  return NextResponse.json({ day: payload })
}

async function buildDayPayload(dayId: string) {
  const day = await prisma.dayEntry.findUnique({ where: { id: dayId } })
  if (!day) throw new Error('Day not found')
  const habits = await prisma.habit.findMany({ where: { isActive: true, OR: [{ userId: null }, { userId: day.userId }] }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } })
  const symptomRows = await prisma.symptomScore.findMany({ where: { dayEntryId: day.id } })
  const symptoms: Record<string, number | undefined> = {}
  for (const s of symptomRows) symptoms[s.type] = s.score
  const stoolRow = await prisma.stoolScore.findUnique({ where: { dayEntryId: day.id } })
  const tickRows = await prisma.habitTick.findMany({ where: { dayEntryId: day.id } })
  const ticks = habits.map(h => ({ habitId: h.id, checked: Boolean(tickRows.find(t => t.habitId === h.id)?.checked) }))
  const dateStr = toYmd(day.date)
  return { id: day.id, date: dateStr, phase: day.phase, careCategory: day.careCategory, notes: day.notes ?? '', symptoms, stool: stoolRow?.bristol ?? undefined, habitTicks: ticks }
}

function toYmd(d: Date) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
