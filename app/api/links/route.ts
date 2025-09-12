import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const rows = await (prisma as any).userLink.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } })
    const links = (rows as any[]).map((r: any) => ({ id: r.id, name: r.name, url: r.url }))
    return NextResponse.json({ links })
  } catch (err) {
    console.error('GET /api/links failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const name = String(body?.name || '').trim()
    const url = String(body?.url || '').trim()
    if (!name || !url) return NextResponse.json({ error: 'Name und URL erforderlich' }, { status: 400 })

    // Basic URL validation: allow absolute (http/https) or app-relative (starting with '/')
    const isAbsolute = /^https?:\/\//i.test(url)
    const isRelative = url.startsWith('/')
    if (!isAbsolute && !isRelative) {
      return NextResponse.json({ error: 'Ungültige URL (erlaubt: http(s) oder /relativ)' }, { status: 400 })
    }

    const created = await (prisma as any).userLink.create({ data: { userId: user.id, name, url } })
    return NextResponse.json({ ok: true, link: { id: created.id, name: created.name, url: created.url } })
  } catch (err) {
    console.error('POST /api/links failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
