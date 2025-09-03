import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const body = await req.json().catch(() => ({} as any))
  const url = String(body?.url || '').trim() || '/placeholder.png'

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const note = await prisma.dayNote.findUnique({ where: { id: noteId }, include: { day: true } })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (note.day.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const photo = await prisma.dayNotePhoto.create({ data: { dayNoteId: noteId, url } })
  return NextResponse.json({ ok: true, photo: { id: photo.id, noteId, url: photo.url } })
}
