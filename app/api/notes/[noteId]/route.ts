import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Local NoteType to avoid build-time dependency on generated Prisma enums
const NoteTypes = ['MEAL', 'REFLECTION'] as const
export type NoteType = typeof NoteTypes[number]

export async function PATCH(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const body = await req.json().catch(() => ({} as any))

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const note = await prisma.dayNote.findUnique({ where: { id: noteId }, include: { day: true } })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (note.day.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { text?: string | null; type?: NoteType; occurredAt?: Date } = {}
  if (typeof body.text === 'string') data.text = String(body.text).trim()
  if (typeof body.type === 'string' && (NoteTypes as readonly string[]).includes(body.type)) {
    data.type = body.type as NoteType
  }
  if (body.time !== undefined) {
    const timeStr = String(body.time)
    const [hhStr, mmStr] = timeStr.split(':')
    const hh = Number(hhStr)
    const mm = Number(mmStr)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
    const occurredAt = new Date(note.day.date)
    occurredAt.setHours(hh, mm, 0, 0)
    data.occurredAt = occurredAt
  }

  const updated = await prisma.dayNote.update({ where: { id: noteId }, data })

  const noteRows = await prisma.dayNote.findMany({ where: { dayEntryId: note.dayEntryId }, orderBy: { occurredAt: 'asc' } })
  const notes = noteRows.map((n: any) => ({ id: n.id, dayId: n.dayEntryId, type: (n.type as unknown as NoteType), time: n.occurredAt?.toISOString().slice(11, 16), text: n.text ?? '' }))
  return NextResponse.json({ ok: true, note: { id: updated.id }, notes })
}
