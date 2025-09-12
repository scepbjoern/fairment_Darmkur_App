import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const last = await prisma.reflection.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    const firstDay = await prisma.dayEntry.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    })

    const now = Date.now()
    let due = false
    let daysSince = 0

    if (last) {
      daysSince = Math.floor((now - last.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      due = now - last.createdAt.getTime() > SIX_DAYS_MS
    } else if (firstDay) {
      daysSince = Math.floor((now - firstDay.date.getTime()) / (24 * 60 * 60 * 1000))
      due = now - firstDay.date.getTime() > SIX_DAYS_MS
    } else {
      due = false
      daysSince = 0
    }

    return NextResponse.json({ due, daysSince })
  } catch (err) {
    console.error('GET /api/reflections/due failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
