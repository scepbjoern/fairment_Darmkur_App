import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await req.json().catch(() => ({} as any))

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const habit = await prisma.habit.findUnique({ where: { id } })
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!habit.userId) return NextResponse.json({ error: 'Cannot modify standard habit' }, { status: 403 })
  if (habit.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { title?: string; isActive?: boolean; sortIndex?: number } = {}
  if (typeof body.title === 'string') data.title = String(body.title).trim() || habit.title
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (body.sortIndex !== undefined) {
    const si = Number(body.sortIndex)
    if (Number.isFinite(si)) data.sortIndex = si
  }

  const updated = await prisma.habit.update({ where: { id }, data, select: { id: true, title: true, isActive: true, sortIndex: true } })
  return NextResponse.json({ ok: true, habit: updated })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const habit = await prisma.habit.findUnique({ where: { id } })
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!habit.userId) return NextResponse.json({ error: 'Cannot delete standard habit' }, { status: 403 })
  if (habit.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete dependent ticks (if any) to avoid FK violations, then the habit
  await prisma.habitTick.deleteMany({ where: { habitId: id } })
  await prisma.habit.delete({ where: { id } })
  return NextResponse.json({ ok: true, deleted: id })
}
