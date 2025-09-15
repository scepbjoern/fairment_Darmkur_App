import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const body = await req.json().catch(() => ({} as any))
    const userSymptomId = String(body?.userSymptomId || '')
    const score = Number(body?.score)
    if (!userSymptomId || !(score >= 1 && score <= 10)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const day = await prisma.dayEntry.findUnique({ where: { id } })
    if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Ownership check: ensure the custom symptom belongs to same user
    const userSym = await (prisma as any).userSymptom.findUnique({ where: { id: userSymptomId } })
    if (!userSym || userSym.userId !== day.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await (prisma as any).userSymptomScore.upsert({
      where: { dayEntryId_userSymptomId: { dayEntryId: day.id, userSymptomId } as any },
      create: { dayEntryId: day.id, userSymptomId, score },
      update: { score },
    })

    const payload = await buildDayPayload(day.id)
    return NextResponse.json({ day: payload })
  } catch (err) {
    console.error('PUT /api/day/[id]/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    let userSymptomId: string | null = null
    try {
      const body = await req.json().catch(() => ({} as any))
      if (body && body.userSymptomId) userSymptomId = String(body.userSymptomId)
    } catch {}
    if (!userSymptomId) {
      try {
        const url = new URL(req.url)
        const p = url.searchParams.get('userSymptomId')
        if (p) userSymptomId = String(p)
      } catch {}
    }
    if (!userSymptomId) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

    const day = await prisma.dayEntry.findUnique({ where: { id } })
    if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Ownership check: ensure the custom symptom belongs to same user
    const userSym = await (prisma as any).userSymptom.findUnique({ where: { id: userSymptomId } })
    if (!userSym || userSym.userId !== day.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await (prisma as any).userSymptomScore.deleteMany({ where: { dayEntryId: day.id, userSymptomId } })

    const payload = await buildDayPayload(day.id)
    return NextResponse.json({ day: payload })
  } catch (err) {
    console.error('DELETE /api/day/[id]/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
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
  // Custom symptoms
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
