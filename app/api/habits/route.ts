import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { DEFAULT_HABIT_ICONS } from '@/lib/default-icons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const habits = await (prisma as any).habit.findMany({
    where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] },
    orderBy: { sortIndex: 'asc' },
    select: { id: true, title: true, userId: true, icon: true },
  })
  const overrides = await (prisma as any).habitIcon?.findMany?.({ where: { userId: user.id, habitId: { in: habits.map((h: any) => h.id) } } }) || []
  const byHabit = new Map<string, string | null>((overrides as any[]).map((o: any) => [o.habitId, o.icon ?? null]))
  const list = habits.map((h: any) => {
    let icon: string | null
    if (h.userId) {
      icon = h.icon ?? null
    } else if (byHabit.has(h.id)) {
      icon = byHabit.get(h.id) ?? null
    } else {
      icon = DEFAULT_HABIT_ICONS[h.title] ?? null
    }
    return { id: h.id, title: h.title, userId: h.userId, icon: icon ?? null }
  })
  return NextResponse.json({ habits: list })
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title || '').trim() || 'Neue Gewohnheit'
  const icon = (typeof body?.icon === 'string' ? String(body.icon).trim() : '') || null

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const last = await prisma.habit.findFirst({ where: { OR: [{ userId: null }, { userId: user.id }] }, orderBy: { sortIndex: 'desc' }, select: { sortIndex: true } })
  const sortIndex = (last?.sortIndex ?? 0) + 1
  const habit = await (prisma as any).habit.create({ data: { userId: user.id, title, icon, isActive: true, sortIndex }, select: { id: true, title: true, userId: true, icon: true } })
  return NextResponse.json({ ok: true, habit })
}
