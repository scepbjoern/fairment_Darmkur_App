import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const row = await (prisma as any).userSymptom.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (row.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const data: any = {}
    if (typeof body.title === 'string') data.title = String(body.title).trim() || row.title
    if (Object.prototype.hasOwnProperty.call(body, 'icon')) {
      const icon = (typeof body.icon === 'string' ? String(body.icon).trim() : '') || null
      data.icon = icon
    }
    const updated = await (prisma as any).userSymptom.update({ where: { id }, data, select: { id: true, title: true, icon: true } })
    return NextResponse.json({ ok: true, symptom: { id: updated.id, title: updated.title, icon: updated.icon ?? null } })
  } catch (err) {
    console.error('PATCH /api/user-symptoms/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const sym = await (prisma as any).userSymptom.findUnique({ where: { id } })
    if (!sym) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sym.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Delete scores first due to FK
    await (prisma as any).userSymptomScore.deleteMany({ where: { userSymptomId: id } })
    await (prisma as any).userSymptom.delete({ where: { id } })
    return NextResponse.json({ ok: true, deleted: id })
  } catch (err) {
    console.error('DELETE /api/user-symptoms/[id] failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
