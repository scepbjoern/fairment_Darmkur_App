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

const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

async function ensureUploadDirForUser(userId: string) {
  const dir = path.join(UPLOADS_BASE, userId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

function nowIsoTime() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const prisma = getPrisma()
    const { id } = await context.params
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const reflection = await (prisma as any).reflection.findUnique({ where: { id } })
    if (!reflection) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (reflection.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 })
    }

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
    const created: { id: string; url: string }[] = []

    for (const file of files) {
      if (!(file instanceof File)) continue
      try {
        const input = Buffer.from(await file.arrayBuffer())
        let pipeline = sharp(input).rotate()
        pipeline = pipeline.resize({ width: IMAGE_MAX_WIDTH, height: IMAGE_MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })

        const base = `${id}_${ts}_${seq++}`
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
        const photo = await (prisma as any).reflectionPhoto.create({ data: { reflectionId: id, url } })
        created.push({ id: photo.id, url })
      } catch (err) {
        console.error('Failed to process reflection file', err)
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, photos: created })
  } catch (err) {
    console.error('POST /api/reflections/[id]/photos failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
