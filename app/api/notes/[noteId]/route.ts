import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

// Ensure this route is always executed at request time on the Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local NoteType to avoid build-time dependency on generated Prisma enums
const NoteTypes = ['MEAL', 'REFLECTION'] as const
export type NoteType = typeof NoteTypes[number]

// Physical uploads base directory (mounted in Docker). Keep in sync with upload API and uploads route.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
function resolveUploadPathFromUrl(url: string): string | null {
  // Only allow URLs inside /uploads/ to avoid deleting arbitrary files
  if (!url || !url.startsWith('/uploads/')) return null
  const rel = url.replace(/^\/+uploads\//, '')
  const abs = path.join(UPLOADS_DIR, rel)
  const normalized = path.normalize(abs)
  // Ensure the resolved path stays within the uploads directory
  if (!normalized.startsWith(UPLOADS_DIR)) return null
  return normalized
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()
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

  const noteRows = await prisma.dayNote.findMany({
    where: { dayEntryId: note.dayEntryId },
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
  return NextResponse.json({ ok: true, note: { id: updated.id }, notes })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params
  const prisma = getPrisma()

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const note = await prisma.dayNote.findUnique({ where: { id: noteId }, include: { day: true, photos: true } })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (note.day.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Try to remove physical photo files
  for (const ph of note.photos) {
    const filePath = resolveUploadPathFromUrl(ph.url)
    if (filePath) {
      try { await fs.unlink(filePath) } catch (err: any) {
        // Ignore if missing
        if (err && err.code !== 'ENOENT') console.warn('Failed to delete note photo file', { filePath, err })
      }
    }
  }

  await prisma.dayNotePhoto.deleteMany({ where: { dayNoteId: noteId } })
  await prisma.dayNote.delete({ where: { id: noteId } })

  // Return refreshed notes list for the same day
  const noteRows = await prisma.dayNote.findMany({
    where: { dayEntryId: note.dayEntryId },
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
  return NextResponse.json({ ok: true, deleted: noteId, notes })
}
