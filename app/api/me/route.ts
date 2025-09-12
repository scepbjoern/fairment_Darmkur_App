import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const prisma = getPrisma()
  const cookieUserId = req.cookies.get('userId')?.value
  let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
  if (!user) {
    user = await prisma.user.findUnique({ where: { username: 'demo' } })
  }
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } })
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      profileImageUrl: (user as any).profileImageUrl ?? null,
      settings: settings ? {
        theme: settings.theme,
        timeFormat24h: settings.timeFormat24h,
        weekStart: settings.weekStart,
        autosaveEnabled: settings.autosaveEnabled,
        autosaveIntervalSec: settings.autosaveIntervalSec,
      } : null,
    },
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const cookieUserId = req.cookies.get('userId')?.value
    let user = cookieUserId ? await prisma.user.findUnique({ where: { id: cookieUserId } }) : null
    if (!user) user = await prisma.user.findUnique({ where: { username: 'demo' } })
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const updates: { username?: string; displayName?: string | null } = {}
    if (typeof body.username === 'string' && body.username.trim() && body.username !== user.username) {
      updates.username = body.username.trim()
    }
    if (body.displayName !== undefined) {
      const dn = typeof body.displayName === 'string' ? body.displayName.trim() : null
      updates.displayName = dn && dn.length > 0 ? dn : null
    }

    const settingsPatch: {
      theme?: 'dark' | 'bright'
      autosaveEnabled?: boolean
      autosaveIntervalSec?: number
    } = {}
    if (body.settings && typeof body.settings === 'object') {
      if (body.settings.theme && (body.settings.theme === 'dark' || body.settings.theme === 'bright')) {
        settingsPatch.theme = body.settings.theme
      }
      if (typeof body.settings.autosaveEnabled === 'boolean') {
        settingsPatch.autosaveEnabled = body.settings.autosaveEnabled
      }
      if (body.settings.autosaveIntervalSec !== undefined) {
        const n = Number(body.settings.autosaveIntervalSec)
        if (Number.isFinite(n) && n >= 1 && n <= 3600) settingsPatch.autosaveIntervalSec = Math.floor(n)
      }
    }

    let updatedUser = user
    if (Object.keys(updates).length > 0) {
      try {
        updatedUser = await prisma.user.update({ where: { id: user.id }, data: updates })
      } catch (err: any) {
        // Prisma unique constraint error
        if (err?.code === 'P2002') {
          return NextResponse.json({ error: 'Username bereits vergeben' }, { status: 409 })
        }
        throw err
      }
    }

    let updatedSettings = await prisma.userSettings.findUnique({ where: { userId: user.id } })
    if (Object.keys(settingsPatch).length > 0) {
      updatedSettings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        create: { userId: user.id, theme: settingsPatch.theme || 'dark', autosaveEnabled: settingsPatch.autosaveEnabled ?? true, autosaveIntervalSec: settingsPatch.autosaveIntervalSec ?? 5, weekStart: 'mon', timeFormat24h: true },
        update: settingsPatch,
      })
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        profileImageUrl: (updatedUser as any).profileImageUrl ?? null,
        settings: updatedSettings ? {
          theme: updatedSettings.theme,
          timeFormat24h: updatedSettings.timeFormat24h,
          weekStart: updatedSettings.weekStart,
          autosaveEnabled: updatedSettings.autosaveEnabled,
          autosaveIntervalSec: updatedSettings.autosaveIntervalSec,
        } : null,
      },
    })
  } catch (err) {
    console.error('PATCH /api/me failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
