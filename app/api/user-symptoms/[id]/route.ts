import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
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
