import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'
import { constants as fsConstants } from 'fs'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

function nowIsoTime() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function ensureUploadDirForUser(userId: string) {
  const dir = path.join(UPLOADS_BASE, userId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }

    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    const file = form.get('file') as unknown as File
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())

    const dir = await ensureUploadDirForUser(user.id)
    try { await fs.access(dir, fsConstants.W_OK) } catch {
      return NextResponse.json({ error: 'Upload directory is not writable' }, { status: 500 })
    }

    const ts = nowIsoTime()
    const fileName = `avatar_${ts}.webp`
    const outPath = path.join(dir, fileName)

    // Square crop to 512x512 and convert to webp
    await sharp(buf)
      .rotate()
      .resize({ width: 512, height: 512, fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(outPath)

    const url = `/uploads/${user.id}/${fileName}`

    // Optionally remove previous avatar if within uploads dir
    if ((user as any).profileImageUrl && typeof (user as any).profileImageUrl === 'string') {
      const prevUrl = (user as any).profileImageUrl as string
      const prefix = `/uploads/${user.id}/`
      if (prevUrl.startsWith(prefix)) {
        const rel = prevUrl.slice(prefix.length)
        const prevPath = path.join(UPLOADS_BASE, user.id, rel)
        try { await fs.unlink(prevPath) } catch {}
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { profileImageUrl: url } })

    return NextResponse.json({ ok: true, url })
  } catch (err) {
    console.error('POST /api/me/avatar failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const url = (user as any).profileImageUrl as string | null | undefined
    if (url && typeof url === 'string') {
      const prefix = `/uploads/${user.id}/`
      if (url.startsWith(prefix)) {
        const rel = url.slice(prefix.length)
        const p = path.join(UPLOADS_BASE, user.id, rel)
        try { await fs.unlink(p) } catch {}
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { profileImageUrl: null } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/me/avatar failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
