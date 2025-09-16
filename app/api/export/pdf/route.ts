import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYMPTOMS = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
] as const
type SymptomKey = typeof SYMPTOMS[number]

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Resolve physical uploads path for URLs like "/uploads/abc/def.jpg"
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
function resolveUploadPathFromUrl(url: string): string | null {
  if (!url || !url.startsWith('/uploads/')) return null
  const rel = url.replace(/^\/+uploads\//, '')
  const abs = path.join(UPLOADS_DIR, rel)
  const normalized = path.normalize(abs)
  if (!normalized.startsWith(UPLOADS_DIR)) return null
  return normalized
}

function parseYmdLocal(s: string | null): Date | null {
  if (!s) return null
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1]); const mo = Number(m[2]) - 1; const d = Number(m[3])
  return new Date(y, mo, d)
}

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const url = new URL(req.url)
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')
    const includePhotos = (url.searchParams.get('photos') || 'false').toLowerCase() === 'true'
    const thumbParam = Number(url.searchParams.get('thumb') || '500')
    const thumbSize = Math.max(50, Math.min(1000, Number.isFinite(thumbParam) ? thumbParam : 500))

    // Resolve user
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId
      ? await prisma.user.findUnique({ where: { id: cookieUserId } })
      : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const from = parseYmdLocal(fromParam)
    const to = parseYmdLocal(toParam)
    const whereDate: any = {}
    if (from) whereDate.gte = from
    if (to) { const end = new Date(to); end.setDate(end.getDate() + 1); whereDate.lt = end }

    const dayEntries = await prisma.dayEntry.findMany({
      where: { userId: user.id, ...(from || to ? { date: whereDate } : {}) },
      orderBy: { date: 'asc' },
      include: {
        symptoms: true,
        stool: true,
        habitTicks: { where: { checked: true }, select: { id: true } },
        notesList: {
          orderBy: { occurredAt: 'asc' },
          include: { photos: true, reflection: true },
        },
      },
    })

    const dayIds = dayEntries.map((d: { id: string }) => d.id)
    const [customDefs, customScores] = await Promise.all([
      (prisma as any).userSymptom.findMany({ where: { userId: user.id, isActive: true }, orderBy: { sortIndex: 'asc' }, select: { id: true, title: true } }),
      dayIds.length
        ? (prisma as any).userSymptomScore.findMany({ where: { dayEntryId: { in: dayIds } }, select: { dayEntryId: true, userSymptomId: true, score: true } })
        : Promise.resolve([] as { dayEntryId: string; userSymptomId: string; score: number }[]),
    ])

    // Build day -> (customSymptomId -> score) map
    const customByDay = new Map<string, Map<string, number>>()
    for (const r of customScores as any[]) {
      const m = customByDay.get(r.dayEntryId) || new Map<string, number>()
      m.set(r.userSymptomId, r.score)
      customByDay.set(r.dayEntryId, m)
    }

    // Prepare PDF
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const pageWidth = 595.28 // A4 portrait
    const pageHeight = 841.89
    const margin = 40
    const contentWidth = pageWidth - margin * 2
    const footerReserve = 24 // keep space for page number footer

    function addPage() {
      const page = pdf.addPage([pageWidth, pageHeight])
      return page
    }

    function drawText(page: any, text: string, x: number, y: number, size = 10, bold = false, color = rgb(0, 0, 0)) {
      page.drawText(text, { x, y, size, font: bold ? fontBold : font, color })
    }

    function ensureSpace(h: number) {
      if (y < margin + footerReserve + h) {
        page = addPage()
        y = pageHeight - margin
      }
    }

    function wrapLines(text: string, maxWidth: number, size: number, fnt: any) {
      const words = (text || '').split(/\s+/)
      const lines: string[] = []
      let current = ''
      for (const w of words) {
        const tentative = current ? current + ' ' + w : w
        const width = fnt.widthOfTextAtSize(tentative, size)
        if (width <= maxWidth) {
          current = tentative
        } else {
          if (current) lines.push(current)
          // word could be longer than width; hard break
          let rest = w
          while (fnt.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
            let i = Math.floor((maxWidth / fnt.widthOfTextAtSize(rest, size)) * rest.length)
            if (i < 1) i = 1
            lines.push(rest.slice(0, i))
            rest = rest.slice(i)
          }
          current = rest
        }
      }
      if (current) lines.push(current)
      return lines
    }

    // Cover page
    let page = addPage()
    let y = pageHeight - margin
    drawText(page, 'Darmkur Export (PDF)', margin, y, 20, true)
    y -= 26
    const rangeLabel = `Zeitraum: ${from ? toYmd(from) : '–'} bis ${to ? toYmd(to) : '–'}`
    drawText(page, rangeLabel, margin, y, 12)
    y -= 18
    drawText(page, `Benutzer: ${user.displayName || user.username}`, margin, y, 12)
    y -= 30
    drawText(page, `Einträge: ${dayEntries.length}`, margin, y, 12)

    // Start content on a new page after cover
    page = addPage()
    y = pageHeight - margin

    // Iterate days
    const habitsTotal = await prisma.habit.count({ where: { isActive: true, OR: [{ userId: null }, { userId: user.id }] } })

    const drawKeyVal = (key: string, val: string, size = 10) => {
      const keyLabel = key + ': '
      const keyW = fontBold.widthOfTextAtSize(keyLabel, size)
      ensureSpace(size + 10)
      // gray label, black value
      drawText(page, keyLabel, margin, y, size, true, rgb(0.35, 0.35, 0.35))
      drawText(page, val, margin + keyW, y, size, false, rgb(0, 0, 0))
      y -= size + 6
    }

    const drawParagraph = (head: string, body: string, size = 10) => {
      const headW = fontBold.widthOfTextAtSize(head + ': ', size)
      const lines = wrapLines(body, contentWidth - headW, size, font)
      ensureSpace(size * (lines.length + 2) + 6)
      drawText(page, head + ': ', margin, y, size, true)
      drawText(page, lines[0] || '', margin + headW, y, size)
      y -= size + 4
      for (let i = 1; i < lines.length; i++) {
        drawText(page, lines[i], margin + headW, y, size)
        y -= size + 4
      }
      y -= 2
    }

    const drawSmallHeading = (t: string) => {
      ensureSpace(20)
      drawText(page, t, margin, y, 12, true, rgb(0.1, 0.1, 0.1))
      y -= 20
    }

    const collator = new Intl.Collator('de-DE', { sensitivity: 'base' })
    const customDefsSorted = (customDefs as any[]).slice().sort((a: any, b: any) => collator.compare(a.title, b.title))

    for (const de of dayEntries) {
      ensureSpace(100)
      const dateLabel = `${toYmd(de.date)}  (Phase ${de.phase.replace('PHASE_', '')}, Pflege ${de.careCategory})`
      drawText(page, dateLabel, margin, y, 16, true)
      y -= 20

      // metrics
      const symptomsMap = new Map<SymptomKey, number>()
      const presentVals: number[] = []
      for (const s of de.symptoms) {
        const k = s.type as SymptomKey
        symptomsMap.set(k, s.score)
        presentVals.push(s.score)
      }
      const wbi = presentVals.length ? Number((presentVals.reduce((a, b) => a + b, 0) / presentVals.length).toFixed(2)) : null
      drawKeyVal('Wohlbefinden-Index', wbi == null ? '—' : String(wbi))
      drawKeyVal('Stuhl (Bristol)', de.stool?.bristol != null ? String(de.stool.bristol) : '—')
      const done = de.habitTicks.length
      const ratio = habitsTotal > 0 ? Number((done / habitsTotal).toFixed(3)) : null
      drawKeyVal('Habits erfüllt', `${done}/${habitsTotal}${ratio != null ? ` (${ratio})` : ''}`)

      const symps = SYMPTOMS.map(k => `${k}: ${symptomsMap.get(k) ?? '—'}`).join(', ')
      drawParagraph('Symptome', symps)

      // Custom user-defined symptoms paragraph
      if ((customDefsSorted as any[]).length > 0) {
        const m = customByDay.get(de.id)
        const customLine = (customDefsSorted as any[]).map((d: any) => `${d.title}: ${m?.get(d.id) ?? '—'}`).join(', ')
        drawParagraph('Eigene Symptome', customLine)
      }

      // notes
      if (de.notesList.length) {
        drawSmallHeading('Notizen')
        for (const note of de.notesList) {
          const time = new Date(note.occurredAt)
          const hh = String(time.getHours()).padStart(2, '0')
          const mm = String(time.getMinutes()).padStart(2, '0')
          drawParagraph(`• [${hh}:${mm}] ${note.type}`, note.text || '—')
          if (note.reflection && (note.reflection.changed || note.reflection.gratitude || note.reflection.vows)) {
            if (note.reflection.changed) drawParagraph('Reflexion – Veränderung', note.reflection.changed)
            if (note.reflection.gratitude) drawParagraph('Reflexion – Dankbarkeit', note.reflection.gratitude)
            if (note.reflection.vows) drawParagraph('Reflexion – Vorsätze', note.reflection.vows)
          }
          if (includePhotos && note.photos && note.photos.length) {
            // Thumbnails
            const origin = req.nextUrl.origin
            const gap = 8
            let x = margin
            let rowMaxH = 0
            for (const ph of note.photos) {
              const localPath = resolveUploadPathFromUrl(ph.url)
              try {
                let img
                if (localPath) {
                  // Read directly from disk to avoid auth/CORS and support private deployments
                  const fileBuf = await fs.readFile(localPath)
                  // Downscale to fit longest side = thumbSize, preserve aspect ratio
                  const resized = await sharp(fileBuf).resize({ width: thumbSize, height: thumbSize, fit: 'inside' }).png().toBuffer()
                  img = await pdf.embedPng(resized)
                } else {
                  // Fallback: fetch via HTTP (useful for absolute URLs)
                  const src = ph.url.startsWith('http') ? ph.url : origin + ph.url
                  const r = await fetch(src)
                  const arr = await r.arrayBuffer()
                  const buf = Buffer.from(arr)
                  // Downscale to fit longest side = thumbSize, preserve aspect ratio; convert to PNG for consistency
                  const resized = await sharp(buf).resize({ width: thumbSize, height: thumbSize, fit: 'inside' }).png().toBuffer()
                  img = await pdf.embedPng(resized)
                }
                const iW = (img as any).width as number
                const iH = (img as any).height as number
                // Wrap to next row if not enough horizontal space
                if (x !== margin && x + iW > pageWidth - margin) {
                  // move to next row using the tallest height of current row
                  ensureSpace(rowMaxH + gap)
                  y -= rowMaxH + gap
                  x = margin
                  rowMaxH = 0
                }
                ensureSpace(iH + 10)
                page.drawImage(img, { x, y: y - iH, width: iW, height: iH })
                x += iW + gap
                if (iH > rowMaxH) rowMaxH = iH
              } catch {
                // show URL placeholder
                const fallbackText = ph.url.startsWith('http') ? ph.url : origin + ph.url
                const lines = wrapLines(fallbackText, contentWidth, 8, font)
                for (const line of lines) {
                  if (y < margin + 20) { page = addPage(); y = pageHeight - margin }
                  drawText(page, line, margin, y, 8, false, rgb(0.2, 0.2, 0.6))
                  y -= 12
                }
              }
            }
            // After finishing the row, consume remaining row height
            if (rowMaxH > 0) {
              ensureSpace(rowMaxH + 8)
              y -= rowMaxH
            }
            y -= 8
          } else if (!includePhotos && note.photos && note.photos.length) {
            drawText(page, `(Fotos: ${note.photos.length} – ausgelassen)`, margin, y, 9, false, rgb(0.4, 0.4, 0.4))
            y -= 14
          }
        }
      }

      // Just add some space between days
      y -= 16
    }

    // Footer: page numbers
    const pages = pdf.getPages()
    pages.forEach((p, idx) => {
      const label = `Seite ${idx + 1} / ${pages.length}`
      p.drawText(label, {
        x: p.getWidth() - margin - font.widthOfTextAtSize(label, 9),
        y: margin / 2,
        size: 9,
        font,
        color: rgb(0.45, 0.45, 0.45),
      })
    })

    const bytes = await pdf.save()
    const res = new NextResponse(Buffer.from(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf' } })
    const now = new Date()
    const fname = `darmkur_export_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.pdf`
    res.headers.set('Content-Disposition', `attachment; filename="${fname}"`)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err) {
    console.error('GET /api/export/pdf failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
