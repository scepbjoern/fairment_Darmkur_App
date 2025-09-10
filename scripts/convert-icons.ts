import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

async function exists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function convertOne(src: string, dst: string) {
  if (!(await exists(src))) {
    console.warn(`[icons] skip: source not found: ${src}`)
    return false
  }
  await fs.mkdir(path.dirname(dst), { recursive: true })
  await sharp(src)
    .png({ quality: 92, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(dst)
  console.log(`[icons] wrote ${dst}`)
  return true
}

async function createAppleTouch(src: string, dst: string) {
  if (!(await exists(src))) return false
  await fs.mkdir(path.dirname(dst), { recursive: true })
  await sharp(src)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 92, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(dst)
  console.log(`[icons] wrote ${dst}`)
  return true
}

async function resizeToPng(src: string, dst: string, size: number) {
  if (!(await exists(src))) return false
  await fs.mkdir(path.dirname(dst), { recursive: true })
  await sharp(src)
    .resize(size, size, { fit: 'cover' })
    .png({ quality: 92, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(dst)
  console.log(`[icons] wrote ${dst}`)
  return true
}

async function main() {
  const base = path.resolve(process.cwd(), 'public', 'icons')
  const avif192 = path.join(base, 'logo_192.avif')
  const avif512 = path.join(base, 'logo_512.avif')

  // Primary PNGs
  await convertOne(avif192, path.join(base, 'logo_192.png'))
  await convertOne(avif512, path.join(base, 'logo_512.png'))

  // Apple touch (180x180): prefer from 512 source
  const srcForApple = (await exists(avif512)) ? avif512 : avif192
  if (await exists(srcForApple)) {
    await createAppleTouch(srcForApple, path.join(base, 'logo_180.png'))
  } else {
    console.warn('[icons] skip: no source for apple-touch 180x180')
  }

  // Favicons 32x32 and 16x16
  const bestSrc = (await exists(avif512)) ? avif512 : avif192
  if (await exists(bestSrc)) {
    await resizeToPng(bestSrc, path.join(base, 'logo_32.png'), 32)
    await resizeToPng(bestSrc, path.join(base, 'logo_16.png'), 16)
  } else {
    console.warn('[icons] skip: no source for favicons 32/16')
  }

  console.log('[icons] done')
}

main().catch((err) => {
  console.error('[icons] failed', err)
  process.exit(1)
})
