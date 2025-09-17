import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { DEFAULT_SYMPTOM_ICONS } from '@/lib/default-icons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const rows = await (prisma as any).symptomIcon.findMany({ where: { userId: user.id } })
  const map: Record<string, string | null> = { ...DEFAULT_SYMPTOM_ICONS }
  for (const r of rows as any[]) map[r.type] = r.icon ?? null
  return NextResponse.json({ icons: map })
}

// Local enum copy to avoid build-time dependency on generated Prisma enums
const _SymptomTypes = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
] as const

export async function PATCH(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const type = String(body?.type || '')
  if (!_SymptomTypes.includes(type as any)) {
    return NextResponse.json({ error: 'Ungültiger Symptomtyp' }, { status: 400 })
  }
  const iconStr = typeof body?.icon === 'string' ? String(body.icon).trim() : ''
  if (!iconStr) {
    // Clear override: delete row so defaults will apply
    await (prisma as any).symptomIcon.deleteMany({ where: { userId: user.id, type } })
    return NextResponse.json({ ok: true, type, icon: null })
  } else {
    const icon = iconStr
    await (prisma as any).symptomIcon.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { icon },
      create: { userId: user.id, type, icon },
    })
    return NextResponse.json({ ok: true, type, icon })
  }
}
