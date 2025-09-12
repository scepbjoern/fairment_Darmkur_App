import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Physical uploads base directory. Defaults to "/app/uploads" (process.cwd()/uploads)
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
// Legacy fallback for older images saved under public/uploads
const LEGACY_BASE = path.join(process.cwd(), 'public', 'uploads')

function lookupContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

function safeResolveFrom(base: string, parts: string[]): string | null {
  const abs = path.join(base, ...parts)
  const norm = path.normalize(abs)
  if (!norm.startsWith(base)) return null
  return norm
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: parts } = await ctx.params
    if (!Array.isArray(parts) || parts.length === 0) {
      const h = new Headers()
      h.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return new NextResponse('Not Found', { status: 404, headers: h })
    }
    // Resolve in current uploads base first, then fallback to legacy public/uploads
    let filePath = safeResolveFrom(UPLOADS_BASE, parts)
    const legacyPath = safeResolveFrom(LEGACY_BASE, parts)
    if (!filePath && !legacyPath) {
      const h = new Headers()
      h.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return new NextResponse('Forbidden', { status: 403, headers: h })
    }

    // Stat file to get size and mtime
    let stat
    try {
      if (filePath) stat = await fs.stat(filePath)
    } catch {}
    if (!stat && legacyPath) {
      try {
        stat = await fs.stat(legacyPath)
        filePath = legacyPath
      } catch {}
    }
    if (!stat) {
      const h = new Headers()
      h.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return new NextResponse('Not Found', { status: 404, headers: h })
    }
    if (!stat.isFile()) {
      const h = new Headers()
      h.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return new NextResponse('Not Found', { status: 404, headers: h })
    }

    // filePath could be from legacy fallback; ensure we have a concrete string
    const effectivePath = (filePath || legacyPath) as string
    const ctype = lookupContentType(effectivePath)
    const etag = `W/"${stat.size}-${stat.mtimeMs}"`

    const headers = new Headers()
    headers.set('Content-Type', ctype)
    headers.set('Content-Length', String(stat.size))
    // No-store to ensure newly uploaded files are visible immediately, even if 404 cached previously
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    headers.set('ETag', etag)

    const data = await fs.readFile(effectivePath)
    // Use Uint8Array for Response body to satisfy BodyInit and avoid SharedArrayBuffer typing issues
    const u8 = new Uint8Array(data)
    return new NextResponse(u8, { status: 200, headers })
  } catch (err) {
    console.error('uploads route error', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
