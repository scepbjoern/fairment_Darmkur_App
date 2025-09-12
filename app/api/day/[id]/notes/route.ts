import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local NoteType definitions to avoid build-time dependency on generated Prisma enums
const NoteTypes = ['MEAL', 'REFLECTION'] as const
export type NoteType = typeof NoteTypes[number]

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()
  const day = await prisma.dayEntry.findUnique({ where: { id } })
  if (!day) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type || '') as NoteType
  const text = String(body?.text || '').trim()
  const time = body?.time ? String(body.time) : undefined
  const tzOffsetMinutes = Number.isFinite(Number(body?.tzOffsetMinutes)) ? Number(body.tzOffsetMinutes) : null
  if (!NoteTypes.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  // occurredAt: respect client local wall-clock time using tzOffsetMinutes to avoid server TZ drift
  const occurredAt = (() => {
    const [hh, mm] = (time || '00:00').split(':').map((n: string) => parseInt(n, 10))
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return day.date
    // Use the UTC year-month-day from the stored day.date to avoid server TZ differences
    const y = day.date.getUTCFullYear()
    const m = day.date.getUTCMonth() // 0-based
    const d = day.date.getUTCDate()
    // Convert client local HH:MM to UTC minutes using provided offset (UTC - Local minutes)
    const offset = typeof tzOffsetMinutes === 'number' ? tzOffsetMinutes : 0
    const minutesLocal = hh * 60 + mm
    const minutesUTC = minutesLocal + offset
    const base = new Date(Date.UTC(y, m, d, 0, 0, 0, 0))
    base.setUTCMinutes(minutesUTC)
    return base
  })()

  const note = await prisma.dayNote.create({
    data: {
      dayEntryId: day.id,
      type,
      text,
      occurredAt,
    },
  })

  const noteRows = await prisma.dayNote.findMany({
    where: { dayEntryId: day.id },
    orderBy: { occurredAt: 'asc' },
    include: { photos: true },
  })
  const notes = noteRows.map((n: any) => ({
    id: n.id,
    dayId: n.dayEntryId,
    type: (n.type as unknown as NoteType),
    time: n.occurredAt?.toISOString().slice(11, 16),
    techTime: n.createdAt?.toISOString().slice(11, 16),
    occurredAtIso: n.occurredAt?.toISOString(),
    createdAtIso: n.createdAt?.toISOString(),
    text: n.text ?? '',
    photos: (n.photos || []).map((p: any) => ({ id: p.id, url: p.url })),
  }))
  return NextResponse.json({ ok: true, note: { id: note.id }, notes })
}
