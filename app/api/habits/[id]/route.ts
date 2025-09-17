import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({} as any))

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const habit = await (prisma as any).habit.findUnique({ where: { id } })
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const iconProvided = Object.prototype.hasOwnProperty.call(body, 'icon')
  // For standard habits (no owner), only icon updates are allowed via HabitIcon override
  if (!habit.userId && !iconProvided) {
    return NextResponse.json({ error: 'Cannot modify standard habit' }, { status: 403 })
  }
  if (habit.userId && habit.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { title?: string; isActive?: boolean; sortIndex?: number } = {}
  if (typeof body.title === 'string') data.title = String(body.title).trim() || habit.title
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (body.sortIndex !== undefined) {
    const si = Number(body.sortIndex)
    if (Number.isFinite(si)) data.sortIndex = si
  }

  // Handle icon update: for user-owned habits, store on Habit; for standard habits, store per-user override via HabitIcon
  const iconStr = typeof body.icon === 'string' ? String(body.icon).trim() : ''
  const iconVal = iconStr ? iconStr : null

  let updated
  if (Object.keys(data).length > 0) {
    updated = await (prisma as any).habit.update({ where: { id }, data, select: { id: true, title: true, isActive: true, sortIndex: true } })
  } else {
    updated = await (prisma as any).habit.findUnique({ where: { id }, select: { id: true, title: true, isActive: true, sortIndex: true } })
  }

  if (iconProvided) {
    if (habit.userId) {
      // Directly update custom habit
      const u2 = await (prisma as any).habit.update({ where: { id }, data: { icon: iconVal }, select: { id: true, title: true, isActive: true, sortIndex: true, icon: true } })
      return NextResponse.json({ ok: true, habit: u2 })
    } else {
      // Standard habit: if empty, delete override to fall back to defaults; else upsert override
      if (!iconStr) {
        await (prisma as any).habitIcon.deleteMany({ where: { userId: user.id, habitId: id } })
        return NextResponse.json({ ok: true, habit: { ...updated, icon: null } })
      } else {
        await (prisma as any).habitIcon.upsert({
          where: { userId_habitId: { userId: user.id, habitId: id } },
          update: { icon: iconVal },
          create: { userId: user.id, habitId: id, icon: iconVal },
        })
        return NextResponse.json({ ok: true, habit: { ...updated, icon: iconVal } })
      }
    }
  }

  return NextResponse.json({ ok: true, habit: updated })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
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
