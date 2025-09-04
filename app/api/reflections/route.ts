import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const rows = await (prisma as any).reflection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { photos: true },
    })

    const reflections = (rows as any[]).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      createdAtIso: r.createdAt.toISOString(),
      changed: r.changed ?? '',
      gratitude: r.gratitude ?? '',
      vows: r.vows ?? '',
      remarks: r.remarks ?? '',
      photos: ((r.photos || []) as any[]).map((p: any) => ({ id: p.id, url: p.url })),
    }))
    return NextResponse.json({ reflections })
  } catch (err) {
    console.error('GET /api/reflections failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const kind = (body?.kind === 'MONTH' ? 'MONTH' : 'WEEK') as 'WEEK' | 'MONTH'
    const changed: string | undefined = body?.changed || undefined
    const gratitude: string | undefined = body?.gratitude || undefined
    const vows: string | undefined = body?.vows || undefined
    const remarks: string | undefined = body?.remarks || undefined

    const created = await (prisma as any).reflection.create({
      data: { userId: user.id, kind, changed, gratitude, vows, remarks },
    })

    return NextResponse.json({ ok: true, reflection: { id: created.id } })
  } catch (err) {
    console.error('POST /api/reflections failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
