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
      weightKg: typeof r.weightKg === 'number' ? r.weightKg : undefined,
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
    const prisma = getPrisma()
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
    // Optional weight in kg (one decimal). Accept string with comma or dot.
    const rawW = body?.weightKg
    const parsedWeight = (() => {
      if (rawW === null) return null
      if (typeof rawW === 'number' && isFinite(rawW)) return Math.round(rawW * 10) / 10
      if (typeof rawW === 'string') {
        const s = rawW.trim()
        if (s === '') return null
        const n = Number(s.replace(',', '.'))
        if (!isNaN(n) && isFinite(n)) return Math.round(n * 10) / 10
      }
      return undefined
    })()

    const data: any = { userId: user.id, kind, changed, gratitude, vows, remarks }
    if (parsedWeight !== undefined) data.weightKg = parsedWeight // undefined => not provided; null => explicit clear (unused for POST)

    let created: any
    try {
      created = await (prisma as any).reflection.create({ data })
    } catch (err: any) {
      // Fallback if Prisma client is not yet generated with weightKg
      if (data.weightKg !== undefined) {
        try {
          const fallback = { ...data }
          delete (fallback as any).weightKg
          created = await (prisma as any).reflection.create({ data: fallback })
        } catch (err2) {
          throw err2
        }
      } else {
        throw err
      }
    }

    return NextResponse.json({ ok: true, reflection: { id: created.id } })
  } catch (err) {
    console.error('POST /api/reflections failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
