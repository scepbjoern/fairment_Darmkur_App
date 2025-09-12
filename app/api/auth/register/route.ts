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
  const displayName = body?.displayName ? String(body.displayName).trim() : null
  if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, displayName: displayName || null, passwordHash },
    select: { id: true, username: true, displayName: true },
  })

  const res = NextResponse.json({ ok: true, user })
  res.cookies.set('userId', user.id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  return res
}
