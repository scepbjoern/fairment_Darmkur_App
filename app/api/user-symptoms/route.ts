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

    const rows = await (prisma as any).userSymptom.findMany({ where: { userId: user.id, isActive: true }, orderBy: { sortIndex: 'asc' } })
    const list = (rows as any[]).map((r: any) => ({ id: r.id, title: r.title, icon: r.icon ?? null }))
    return NextResponse.json({ symptoms: list })
  } catch (err) {
    console.error('GET /api/user-symptoms failed', err)
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
    const title = String(body?.title || '').trim()
    const icon = (typeof body?.icon === 'string' ? String(body.icon).trim() : '') || null
    if (!title) return NextResponse.json({ error: 'Titel erforderlich' }, { status: 400 })

    // Determine next sortIndex
    const max = await (prisma as any).userSymptom.findFirst({ where: { userId: user.id }, orderBy: { sortIndex: 'desc' }, select: { sortIndex: true } })
    const sortIndex = (max?.sortIndex ?? 0) + 1

    const created = await (prisma as any).userSymptom.create({ data: { userId: user.id, title, icon, sortIndex, isActive: true } })
    return NextResponse.json({ ok: true, symptom: { id: created.id, title: created.title, icon: created.icon ?? null } })
  } catch (err) {
    console.error('POST /api/user-symptoms failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
