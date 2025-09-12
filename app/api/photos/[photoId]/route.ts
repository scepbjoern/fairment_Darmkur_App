import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

// Run on Node.js and disable static evaluation
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function DELETE(req: NextRequest, context: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await context.params
  const prisma = getPrisma()

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

  // Try to remove the physical file as well
  const filePath = resolveUploadPathFromUrl(photo.url)
  let fileDeleted = false
  if (filePath) {
    try {
      await fs.unlink(filePath)
      fileDeleted = true
    } catch (err: any) {
      // Ignore if file is already missing; log other errors
      if (err && err.code !== 'ENOENT') {
        console.warn('Failed to delete photo file', { filePath, err })
      }
    }
  }

  await prisma.dayNotePhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ ok: true, deleted: photoId, fileDeleted })
}
