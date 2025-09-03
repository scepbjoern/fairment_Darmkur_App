import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, context: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await context.params

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const photo = await prisma.dayNotePhoto.findUnique({
    where: { id: photoId },
    include: { note: { include: { day: true } } },
  })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (photo.note.day.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.dayNotePhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ ok: true, deleted: photoId })
}
