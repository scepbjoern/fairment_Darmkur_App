import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const habits = await prisma.habit.findMany({
    where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] },
    orderBy: { sortIndex: 'asc' },
    select: { id: true, title: true, userId: true },
  })
  return NextResponse.json({ habits })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title || '').trim() || 'Neue Gewohnheit'

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const last = await prisma.habit.findFirst({ where: { OR: [{ userId: null }, { userId: user.id }] }, orderBy: { sortIndex: 'desc' }, select: { sortIndex: true } })
  const sortIndex = (last?.sortIndex ?? 0) + 1
  const habit = await prisma.habit.create({ data: { userId: user.id, title, isActive: true, sortIndex }, select: { id: true, title: true, userId: true } })
  return NextResponse.json({ ok: true, habit })
}
