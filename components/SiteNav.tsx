"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthNav } from '@/components/AuthNav'

type UserLite = { id: string; username: string; displayName: string | null } | null

export function SiteNav({ user }: { user: UserLite }) {
  const [open, setOpen] = useState(false)
  const [installEvt, setInstallEvt] = useState<any>(null)

  // Listen for install prompt availability
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallEvt(e)
    }
    const onInstalled = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', handler as any)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as any)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canInstall = Boolean(installEvt)
  const doInstall = async () => {
    try {
      if (!installEvt) return
      installEvt.prompt()
      const { outcome } = await installEvt.userChoice
      // After a choice, Chrome may not re-fire the event until next visit
      setInstallEvt(null)
      // Optionally: analytics based on outcome ('accepted' | 'dismissed')
    } catch (_) {
      // noop
    }
  }

  function close() { setOpen(false) }

  return (
    <div className="relative">
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-4">
        <Link href="/analytics" className="text-gray-300 hover:text-white">Auswertungen</Link>
        <Link href="/reflections" className="text-gray-300 hover:text-white">Reflexionen</Link>
        <Link href="/export" className="text-gray-300 hover:text-white">Export</Link>
        <Link href="/settings" className="text-gray-300 hover:text-white">Einstellungen</Link>
        {canInstall && (
          <button
            type="button"
            onClick={doInstall}
            className="pill"
            title="App installieren"
          >
            Installieren
          </button>
        )}
        <AuthNav user={user} />
      </nav>

      {/* Mobile: hamburger */}
      <button
        aria-label="Menü öffnen"
        className="md:hidden text-gray-300 hover:text-white"
        onClick={() => setOpen(v => !v)}
      >
        ☰
      </button>

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-slate-800 rounded-xl shadow-lg p-2 md:hidden z-20">
          <div className="flex flex-col gap-1">
            <Link href="/" className="px-3 py-2 rounded hover:bg-pill" onClick={close}>Start</Link>
            <Link href="/analytics" className="px-3 py-2 rounded hover:bg-pill" onClick={close}>Auswertungen</Link>
            <Link href="/reflections" className="px-3 py-2 rounded hover:bg-pill" onClick={close}>Reflexionen</Link>
            <Link href="/export" className="px-3 py-2 rounded hover:bg-pill" onClick={close}>Export</Link>
            <Link href="/settings" className="px-3 py-2 rounded hover:bg-pill" onClick={close}>Einstellungen</Link>
            {canInstall && (
              <button
                type="button"
                className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-left"
                onClick={() => { close(); doInstall() }}
              >
                App installieren
              </button>
            )}
            <div className="border-t border-slate-800 my-1" />
            <div className="px-3 py-2">
              <AuthNav user={user} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
