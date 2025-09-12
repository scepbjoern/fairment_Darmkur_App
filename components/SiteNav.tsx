"use client"
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AuthNav } from '@/components/AuthNav'

type UserLite = { id: string; username: string; displayName: string | null; profileImageUrl?: string | null } | null

// Minimal PWA install prompt event typing
interface BeforeInstallPromptEvent extends Event {
  prompt: () => void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function SiteNav({ user }: { user: UserLite }) {
  const [open, setOpen] = useState(false)
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [linksOpen, setLinksOpen] = useState(false)
  const linksRef = useRef<HTMLDivElement | null>(null)
  const [customLinks, setCustomLinks] = useState<{ id: string; name: string; url: string }[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRefDesktop = useRef<HTMLDivElement | null>(null)
  const userMenuRefMobile = useRef<HTMLDivElement | null>(null)
  const [mobileLinksOpen, setMobileLinksOpen] = useState(false)

  // Listen for install prompt availability
  useEffect(() => {
    const onBeforeInstallPrompt = (ev: Event) => {
      const e = ev as unknown as BeforeInstallPromptEvent
      e.preventDefault()
      setInstallEvt(e)
    }
    const onInstalled = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Close links menu on outside click or Escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = linksRef.current
      if (linksOpen && el && !el.contains(e.target as Node)) setLinksOpen(false)
      const uelD = userMenuRefDesktop.current
      const uelM = userMenuRefMobile.current
      const insideDesktop = !!(uelD && uelD.contains(e.target as Node))
      const insideMobile = !!(uelM && uelM.contains(e.target as Node))
      if (userMenuOpen && !insideDesktop && !insideMobile) setUserMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setLinksOpen(false); setUserMenuOpen(false); setMenuOpen(false); setMobileLinksOpen(false) }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [linksOpen, userMenuOpen, menuOpen, mobileLinksOpen])

  const canInstall = Boolean(installEvt)
  const doInstall = async () => {
    try {
      if (!installEvt) return
      installEvt.prompt()
      const { outcome: _outcome } = await installEvt.userChoice
      // After a choice, Chrome may not re-fire the event until next visit
      setInstallEvt(null)
      // Optionally: analytics based on outcome ('accepted' | 'dismissed')
    } catch (_) {
      // noop
    }
  }

  function close() { setOpen(false); setMobileLinksOpen(false) }

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
        <Link href="/" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Tagebuch</Link>
        <Link href="/reflections" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Reflexionen</Link>
        <Link href="/analytics" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Auswertungen</Link>
        {/* Links submenu (desktop) */}
        <div className="relative" ref={linksRef}>
          <button type="button" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onMouseEnter={() => setLinksOpen(true)} onClick={() => setLinksOpen(v => !v)} aria-expanded={linksOpen} aria-haspopup="menu">
            Links ▾
          </button>
          {linksOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-surface border border-slate-800 rounded-xl shadow-lg p-2 z-30" onMouseEnter={() => setLinksOpen(true)}>
              <div className="flex flex-col gap-1">
                {staticLinks.map(l => (
                  <button key={`static-${l.name}`} className="text-left px-3 py-2 rounded hover:bg-pill text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => { openExternal(l.url); setLinksOpen(false) }}>
                    {l.name}
                  </button>
                ))}
                {customLinks.length > 0 && <div className="h-px bg-slate-800 my-1" />}
                {customLinks.map(l => (
                  <button key={l.id} className="text-left px-3 py-2 rounded hover:bg-pill text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => { openExternal(l.url); setLinksOpen(false) }}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Desktop: hamburger for secondary items */}
        <div className="relative">
          <button aria-label="Menü" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => setMenuOpen(v => !v)}>☰</button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-slate-800 rounded-xl shadow-lg p-2 z-30" role="menu">
              <div className="flex flex-col gap-1">
                <Link href="/export" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => setMenuOpen(false)}>Export</Link>
                <Link href="/settings" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => setMenuOpen(false)}>Einstellungen</Link>
                <Link href="/help" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => setMenuOpen(false)}>App-Hilfe</Link>
                {canInstall && (
                  <button type="button" className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-left" onClick={() => { setMenuOpen(false); doInstall() }}>Installieren</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar menu */}
        <div className="relative" ref={userMenuRefDesktop}>
          {user ? (
            <button className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600" onClick={() => setUserMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={userMenuOpen}>
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-200 font-semibold">{(user.displayName || user.username || '?').slice(0,1).toUpperCase()}</span>
              )}
            </button>
          ) : (
            <Link href="/login" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Login</Link>
          )}
          {user && userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-slate-800 rounded-xl shadow-lg p-3 z-30" role="menu">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="h-10 w-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm text-gray-200 font-semibold">
                      {(user.displayName || user.username || '?').slice(0,1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user.displayName || user.username}</div>
                  <div className="text-xs text-gray-400 truncate">@{user.username}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <Link href="/settings" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => setUserMenuOpen(false)}>Profil ändern</Link>
                <button
                  className="px-3 py-2 rounded text-left hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={async () => { try { await fetch('/api/auth/logout', { method: 'POST' }) } finally { window.location.href = '/login' } }}
                >Abmelden</button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile: controls row */}
      <div className="md:hidden flex items-center gap-3">
        <button
          aria-label="Menü öffnen"
          className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          onClick={() => setOpen(v => !v)}
        >
          ☰
        </button>
        {/* Mobile: user avatar menu */}
        <div className="relative" ref={userMenuRefMobile}>
          {user ? (
            <button className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600" onClick={() => setUserMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={userMenuOpen}>
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-200 font-semibold">{(user.displayName || user.username || '?').slice(0,1).toUpperCase()}</span>
              )}
            </button>
          ) : (
            <Link href="/login" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Login</Link>
          )}
          {user && userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-slate-800 rounded-xl shadow-lg p-3 z-30" role="menu">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="h-10 w-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm text-gray-200 font-semibold">
                      {(user.displayName || user.username || '?').slice(0,1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user.displayName || user.username}</div>
                  <div className="text-xs text-gray-400 truncate">@{user.username}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <Link href="/settings" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => setUserMenuOpen(false)}>Profil ändern</Link>
                <button
                  className="px-3 py-2 rounded text-left hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={async () => { try { await fetch('/api/auth/logout', { method: 'POST' }) } finally { window.location.href = '/login' } }}
                >Abmelden</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-slate-800 rounded-xl shadow-lg p-2 md:hidden z-20">
          <div className="flex flex-col gap-1">
            <Link href="/" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={close}>Tagebuch</Link>
            <Link href="/analytics" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={close}>Auswertungen</Link>
            <Link href="/reflections" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={close}>Reflexionen</Link>
            <Link href="/export" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={close}>Export</Link>
            {/* Links submenu (mobile): collapsible */}
            <button
              type="button"
              className="px-3 py-2 rounded text-left hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white flex items-center justify-between"
              onClick={() => setMobileLinksOpen(v => !v)}
              aria-expanded={mobileLinksOpen}
              aria-controls="mobile-links-submenu"
            >
              <span>Links</span>
              <span>{mobileLinksOpen ? '▴' : '▾'}</span>
            </button>
            {mobileLinksOpen && (
              <div id="mobile-links-submenu" className="pl-2">
                {[...staticLinks, ...customLinks].map((l, idx) => (
                  <button key={`m-${'id' in l ? l.id : idx}`} className="w-full px-3 py-2 rounded text-left hover:bg-pill text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={() => { close(); openExternal(l.url) }}>
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            <Link href="/settings" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={close}>Einstellungen</Link>
            <Link href="/help" className="px-3 py-2 rounded hover:bg-pill text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" onClick={close}>App-Hilfe</Link>
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
