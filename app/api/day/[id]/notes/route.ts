import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NoteType } from '@prisma/client'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type || '') as NoteType
  const text = String(body?.text || '').trim()
  const time = body?.time ? String(body.time) : undefined
  if (!Object.values(NoteType).includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  // occurredAt = day.date with optional HH:MM
  const occurredAt = new Date(day.date)
  if (time) {
    const [hh, mm] = time.split(':').map((n: string) => parseInt(n, 10))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
    occurredAt.setHours(hh, mm, 0, 0)
  } else {
    occurredAt.setHours(0, 0, 0, 0)
  }

  const note = await prisma.dayNote.create({
    data: {
      dayEntryId: day.id,
      type,
      text,
      occurredAt,
    },
  })

  const noteRows = await prisma.dayNote.findMany({ where: { dayEntryId: day.id }, orderBy: { occurredAt: 'asc' } })
  const notes = noteRows.map(n => ({ id: n.id, dayId: n.dayEntryId, type: n.type as NoteType, time: n.occurredAt?.toISOString().slice(11, 16), text: n.text ?? '' }))
  return NextResponse.json({ ok: true, note: { id: note.id }, notes })
}
