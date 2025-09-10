"use client"
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AuthNav } from '@/components/AuthNav'

type UserLite = { id: string; username: string; displayName: string | null } | null

export function SiteNav({ user }: { user: UserLite }) {
  const [open, setOpen] = useState(false)
  const [installEvt, setInstallEvt] = useState<any>(null)
  const [linksOpen, setLinksOpen] = useState(false)
  const linksRef = useRef<HTMLDivElement | null>(null)
  const [customLinks, setCustomLinks] = useState<{ id: string; name: string; url: string }[]>([])

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

  // Close links menu on outside click or Escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!linksOpen) return
      const el = linksRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) setLinksOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLinksOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [linksOpen])

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

  // Load user-defined links for submenu
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch('/api/links', { credentials: 'same-origin' })
        if (!res.ok) return
        const data = await res.json()
        if (!aborted) setCustomLinks(Array.isArray(data.links) ? data.links : [])
      } catch { /* ignore */ }
    })()
    return () => { aborted = true }
  }, [])

  // Open a link in a new browser tab/window. If relative, make absolute first.
  function openExternal(href: string) {
    try {
      const isAbs = /^https?:\/\//i.test(href)
      const abs = isAbs ? href : `${window.location.origin}${href}`
      window.open(abs, '_blank', 'noopener,noreferrer')
    } catch { /* ignore */ }
  }

  const staticLinks: { name: string; url: string }[] = [
    { name: 'Ernährungstabelle', url: '/docs/Ernaehrungstabelle.pdf' },
    { name: 'Darmguide', url: '/docs/Darmguide.pdf' },
    { name: 'Darmkurguide', url: '/docs/Darmkur-Guide.pdf' },
    { name: 'Rezeptheft', url: '/docs/Rezeptheft.pdf' },
    { name: 'Video-Coaching', url: 'https://fairment-gmbh.mykajabi.com/products/biombalance-kur-video-coaching' },
    { name: 'Community', url: 'https://fairment-gmbh.mykajabi.com/products/communities/v2/biombalancekur/home' },
    { name: 'Webinare', url: 'https://fairment-gmbh.mykajabi.com/products/webinare-live-calls' },
  ]

  return (
    <div className="relative">
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-4">
        <Link href="/analytics" className="text-gray-300 hover:text-white">Auswertungen</Link>
        <Link href="/reflections" className="text-gray-300 hover:text-white">Reflexionen</Link>
        <Link href="/export" className="text-gray-300 hover:text-white">Export</Link>
        {/* Links submenu (desktop) */}
        <div className="relative" ref={linksRef}>
          <button type="button" className="text-gray-300 hover:text-white" onMouseEnter={() => setLinksOpen(true)} onClick={() => setLinksOpen(v => !v)} aria-expanded={linksOpen} aria-haspopup="menu">
            Links ▾
          </button>
          {linksOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-surface border border-slate-800 rounded-xl shadow-lg p-2 z-30" onMouseEnter={() => setLinksOpen(true)}>
              <div className="flex flex-col gap-1">
                {staticLinks.map(l => (
                  <button key={`static-${l.name}`} className="text-left px-3 py-2 rounded hover:bg-pill" onClick={() => { openExternal(l.url); setLinksOpen(false) }}>
                    {l.name}
                  </button>
                ))}
                {customLinks.length > 0 && <div className="h-px bg-slate-800 my-1" />}
                {customLinks.map(l => (
                  <button key={l.id} className="text-left px-3 py-2 rounded hover:bg-pill" onClick={() => { openExternal(l.url); setLinksOpen(false) }}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
            {/* Links submenu (mobile): render as simple list */}
            <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-gray-400">Links</div>
            {[...staticLinks, ...customLinks].map((l, idx) => (
              <button key={`m-${'id' in l ? l.id : idx}`} className="px-3 py-2 rounded text-left hover:bg-pill" onClick={() => { close(); openExternal(l.url) }}>
                {l.name}
              </button>
            ))}
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
