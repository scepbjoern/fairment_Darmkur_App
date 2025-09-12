import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'
import { constants as fsConstants } from 'fs'
import sharp from 'sharp'

const IMAGE_MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH || '1600', 10)
const IMAGE_MAX_HEIGHT = parseInt(process.env.IMAGE_MAX_HEIGHT || '1600', 10)
const IMAGE_FORMAT = (process.env.IMAGE_FORMAT || 'webp').toLowerCase() as 'webp' | 'png' | 'jpeg'
const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || '80', 10)

// Base directory for persisted uploads (mounted in Docker to survive restarts)
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

async function ensureUploadDirForUser(userId: string) {
  const dir = path.join(UPLOADS_BASE, userId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

function nowIsoTime() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export async function POST(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  try {
    const prisma = getPrisma()
    const { noteId } = await context.params
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const note = await prisma.dayNote.findUnique({ where: { id: noteId }, include: { day: true } })
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (note.day.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const contentType = req.headers.get('content-type') || ''

    const createdPhotos: { id: string; url: string }[] = []
    if (contentType.includes('application/json')) {
      // JSON body with URL (fallback)
      const body = await req.json().catch(() => ({} as any))
      const url = String(body?.url || '').trim()
      if (!url) return NextResponse.json({ error: 'No url provided' }, { status: 400 })
      const photo = await prisma.dayNotePhoto.create({ data: { dayNoteId: noteId, url } })
      createdPhotos.push({ id: photo.id, url: photo.url })
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData().catch(err => {
        console.error('formData parse failed', err)
        return null as any
      })
      if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
      const files = form.getAll('files') as unknown as File[]
      if (!files || files.length === 0) return NextResponse.json({ error: 'No files' }, { status: 400 })

      const uploadDir = await ensureUploadDirForUser(user.id)
      try {
        await fs.access(uploadDir, fsConstants.W_OK)
      } catch {
        console.error('Upload dir not writable', { uploadDir })
        return NextResponse.json({ error: 'Upload directory is not writable', uploadDir }, { status: 500 })
      }
      const ts = nowIsoTime()
      let seq = 0
      for (const file of files) {
        if (!(file instanceof File)) continue
        try {
          const arrayBuffer = await file.arrayBuffer()
          const input = Buffer.from(arrayBuffer)

          let pipeline = sharp(input).rotate()
          pipeline = pipeline.resize({ width: IMAGE_MAX_WIDTH, height: IMAGE_MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })

          const base = `${noteId}_${ts}_${seq++}`
          let fileName: string
          if (IMAGE_FORMAT === 'png') {
            pipeline = pipeline.png({ quality: IMAGE_QUALITY })
            fileName = `${base}.png`
          } else if (IMAGE_FORMAT === 'jpeg') {
            pipeline = pipeline.jpeg({ quality: IMAGE_QUALITY })
            fileName = `${base}.jpg`
          } else {
            pipeline = pipeline.webp({ quality: IMAGE_QUALITY })
            fileName = `${base}.webp`
          }

          const outPath = path.join(uploadDir, fileName)
          await pipeline.toFile(outPath)
          const url = `/uploads/${user.id}/${fileName}`
          const photo = await prisma.dayNotePhoto.create({ data: { dayNoteId: noteId, url } })
          createdPhotos.push({ id: photo.id, url })
        } catch (err) {
          console.error('Failed to process/upload file', err)
          return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }

    // Return refreshed notes list for the day enriched with photos and tech time
    const noteRows = await prisma.dayNote.findMany({
      where: { dayEntryId: note.dayEntryId },
      orderBy: { occurredAt: 'asc' },
      include: { photos: true },
    })
    const notes = noteRows.map((n: any) => ({
      id: n.id,
      dayId: n.dayEntryId,
      type: n.type,
      time: n.occurredAt?.toISOString().slice(11, 16),
      techTime: n.createdAt?.toISOString().slice(11, 16),
      occurredAtIso: n.occurredAt?.toISOString(),
      createdAtIso: n.createdAt?.toISOString(),
      text: n.text ?? '',
      photos: (n.photos || []).map((p: any) => ({ id: p.id, url: p.url })),
    }))
    return NextResponse.json({ ok: true, photos: createdPhotos, notes })
  } catch (err) {
    console.error('Photo upload failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
