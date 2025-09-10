import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toYmdLocal(d: Date) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthRange(ym: string) {
  const [y, m] = ym.split('-').map((n: string) => parseInt(n, 10))
  const start = new Date(y, (m || 1) - 1, 1)
  const end = new Date(y, (m || 1) - 1 + 1, 1)
  return { start, end }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const monthStr = searchParams.get('month') // YYYY-MM
  if (!monthStr) {
    return NextResponse.json({ error: 'Missing month (YYYY-MM)' }, { status: 400 })
  }
  const { start, end } = getMonthRange(monthStr)

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId
    ? await prisma.user.findUnique({ where: { id: cookieUserId } })
    : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })
  }

  // Only days that actually have data: any of notes, symptoms, stool, habit ticks, or free-text notes
  const rows = await prisma.dayEntry.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lt: end },
      OR: [
        { notesList: { some: {} } },
        { symptoms: { some: {} } },
        { habitTicks: { some: {} } },
        { stool: { isNot: null } },
        { NOT: { notes: null } },
      ],
    },
    select: { date: true },
    orderBy: { date: 'asc' },
  })

  const days = rows.map((r: { date: Date }) => toYmdLocal(r.date))

  // Reflection entries within the same month window (based on creation date)
  const reflRows = await (prisma as any).reflection.findMany({
    where: { userId: user.id, createdAt: { gte: start, lt: end } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  const reflectionDays = Array.from(new Set((reflRows as any[]).map((r: { createdAt: Date }) => toYmdLocal(r.createdAt))))

  return NextResponse.json({ days, reflectionDays })
}
