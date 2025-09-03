import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  // Clear cookie
  res.cookies.set('userId', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 })
  return res
}
