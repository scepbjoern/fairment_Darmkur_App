import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
  }
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })
  return NextResponse.json({ user: { id: user.id, username: user.username, displayName: user.displayName } })
}
