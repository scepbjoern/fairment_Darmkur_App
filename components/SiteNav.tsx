"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { AuthNav } from '@/components/AuthNav'

type UserLite = { id: string; username: string; displayName: string | null } | null

export function SiteNav({ user }: { user: UserLite }) {
  const [open, setOpen] = useState(false)

  function close() { setOpen(false) }

  return (
    <div className="relative">
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-4">
        <Link href="/analytics" className="text-gray-300 hover:text-white">Auswertungen</Link>
        <Link href="/reflections" className="text-gray-300 hover:text-white">Reflexionen</Link>
        <Link href="/settings" className="text-gray-300 hover:text-white">Einstellungen</Link>
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
            <Link href="/settings" className="px-3 py-2 rounded hover:bg-pill" onClick={close}>Einstellungen</Link>
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
