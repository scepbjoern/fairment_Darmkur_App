import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const prisma = getPrisma()
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username || '').trim()
  const password = String(body?.password || '').trim()
  if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username, displayName: user.displayName } })
  res.cookies.set('userId', user.id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  return res
}
