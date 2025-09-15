import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const reflection = await (prisma as any).reflection.findUnique({ where: { id } })
  if (!reflection) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (reflection.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({} as any))
  const data: any = {}
  if (typeof body.changed === 'string') data.changed = body.changed
  if (typeof body.gratitude === 'string') data.gratitude = body.gratitude
  if (typeof body.vows === 'string') data.vows = body.vows
  if (typeof body.remarks === 'string') data.remarks = body.remarks
  // Optional: weightKg (Float?). Accept string with comma/dot, number, or null to clear
  if (Object.prototype.hasOwnProperty.call(body, 'weightKg')) {
    const rawW = body.weightKg
    const parsed = (() => {
      if (rawW === null) return null
      if (typeof rawW === 'number' && isFinite(rawW)) return Math.round(rawW * 10) / 10
      if (typeof rawW === 'string') {
        const s = rawW.trim()
        if (s === '') return null
        const n = Number(s.replace(',', '.'))
        if (!isNaN(n) && isFinite(n)) return Math.round(n * 10) / 10
      }
      return undefined
    })()
    if (parsed !== undefined) data.weightKg = parsed
  }

  try {
    const updated = await (prisma as any).reflection.update({ where: { id }, data })
    return NextResponse.json({ ok: true, reflection: { id: updated.id } })
  } catch (err: any) {
    // Fallback if Prisma client is not yet generated with weightKg
    if (Object.prototype.hasOwnProperty.call(data, 'weightKg')) {
      const fallback: any = { ...data }
      delete fallback.weightKg
      const updated = await (prisma as any).reflection.update({ where: { id }, data: fallback })
      return NextResponse.json({ ok: true, reflection: { id: updated.id } })
    }
    throw err
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const prisma = getPrisma()

  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const reflection = await (prisma as any).reflection.findUnique({ where: { id }, include: { photos: true } })
  if (!reflection) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (reflection.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Try to remove physical photo files
  for (const ph of (reflection.photos || []) as any[]) {
    const filePath = resolveUploadPathFromUrl(ph.url)
    if (filePath) {
      try { await fs.unlink(filePath) } catch (err: any) {
        // Ignore if missing
        if (err && err.code !== 'ENOENT') console.warn('Failed to delete reflection photo file', { filePath, err })
      }
    }
  }

  await (prisma as any).reflectionPhoto.deleteMany({ where: { reflectionId: id } })
  await (prisma as any).reflection.delete({ where: { id } })

  return NextResponse.json({ ok: true, deleted: id })
}
