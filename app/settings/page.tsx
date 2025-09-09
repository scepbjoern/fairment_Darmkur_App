"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { SaveIndicator, useSaveIndicator } from '@/components/SaveIndicator'
import { useRouter } from 'next/navigation'

type Me = {
  id: string
  username: string
  displayName: string | null
  settings: {
    theme: 'dark' | 'bright'
    autosaveEnabled: boolean
    autosaveIntervalSec: number
    timeFormat24h: boolean
    weekStart: string
  } | null
}

type Habit = { id: string; title: string; userId: string | null }

type ImageSettings = {
  format: 'webp' | 'png' | 'jpeg'
  quality: number
  maxWidth: number
  maxHeight: number
}

export default function SettingsPage() {
  const router = useRouter()
  const { saving, savedAt, startSaving, doneSaving } = useSaveIndicator()

  const [me, setMe] = useState<Me | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [theme, setTheme] = useState<'dark' | 'bright'>('dark')
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [autosaveIntervalSec, setAutosaveIntervalSec] = useState(5)
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabit, setNewHabit] = useState('')
  const [imageSettings, setImageSettings] = useState<ImageSettings>({ format: 'webp', quality: 80, maxWidth: 1600, maxHeight: 1600 })
  const [profileError, setProfileError] = useState<string | null>(null)

  async function load() {
    try {
      const [meRes, habitsRes] = await Promise.all([
        fetch('/api/me', { credentials: 'same-origin' }),
        fetch('/api/habits', { credentials: 'same-origin' }),
      ])
      if (meRes.ok) {
        const data = await meRes.json()
        const u: Me = data.user
        setMe(u)
        setUsername(u.username)
        setDisplayName(u.displayName || '')
        setTheme(u.settings?.theme === 'bright' ? 'bright' : 'dark')
        setAutosaveEnabled(u.settings?.autosaveEnabled ?? true)
        setAutosaveIntervalSec(u.settings?.autosaveIntervalSec ?? 5)
      }
      if (habitsRes.ok) {
        const data = await habitsRes.json()
        setHabits(data.habits || [])
      }
      // Load image settings from localStorage
      try {
        const raw = localStorage.getItem('imageSettings')
        if (raw) {
          const parsed = JSON.parse(raw)
          setImageSettings({
            format: ['webp', 'png', 'jpeg'].includes(parsed.format) ? parsed.format : 'webp',
            quality: Math.min(100, Math.max(1, Number(parsed.quality) || 80)),
            maxWidth: Math.max(100, Number(parsed.maxWidth) || 1600),
            maxHeight: Math.max(100, Number(parsed.maxHeight) || 1600),
          })
        }
      } catch {}
    } catch {}
  }

  useEffect(() => { load() }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName })
      })
      const data = await res.json()
      if (!res.ok) {
        setProfileError(data?.error || 'Speichern fehlgeschlagen')
      } else {
        setMe(data.user)
      }
    } catch {
      setProfileError('Netzwerkfehler')
    } finally {
      doneSaving()
    }
  }

  async function saveUI() {
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { theme } })
      })
      if (res.ok) {
        // Apply theme immediately on client for instant feedback
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
          root.classList.remove('bright')
        } else {
          root.classList.remove('dark')
          root.classList.add('bright')
        }
        // Persist cookie so server-side rendering reads the same preference
        try { document.cookie = `theme=${theme}; path=/; max-age=31536000`; } catch {}
        router.refresh()
      }
    } finally {
      doneSaving()
    }
  }

  async function saveCapture() {
    // Persist only in localStorage for client-side photo upload preferences
    try {
      localStorage.setItem('imageSettings', JSON.stringify(imageSettings))
    } catch {}
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { autosaveEnabled, autosaveIntervalSec } })
      })
      await res.json().catch(() => ({}))
    } finally {
      doneSaving()
    }
  }

  async function addHabit() {
    const title = newHabit.trim()
    if (!title) return
    try {
      const res = await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }), credentials: 'same-origin' })
      const data = await res.json()
      if (data?.habit) {
        // Refresh from server to ensure full, sorted list and userId present
        try {
          const r = await fetch('/api/habits', { credentials: 'same-origin' })
          if (r.ok) {
            const dd = await r.json()
            setHabits(dd.habits || [])
          }
        } catch {}
        setNewHabit('')
      }
    } catch {}
  }

  async function deleteHabit(id: string, userId: string | null) {
    if (!id || !userId) return // allow deleting only user-owned habits
    try {
      const res = await fetch(`/api/habits/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (data?.ok) {
        // Reload from server to reflect authoritative state
        try {
          const r = await fetch('/api/habits', { credentials: 'same-origin' })
          if (r.ok) {
            const dd = await r.json()
            setHabits(dd.habits || [])
          } else {
            setHabits(hs => hs.filter(h => h.id !== id))
          }
        } catch {
          setHabits(hs => hs.filter(h => h.id !== id))
        }
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Einstellungen</h1>

      <div className="card p-4 space-y-3">
        <h2 className="font-medium">Profil</h2>
        <form onSubmit={saveProfile} className="grid gap-3 max-w-md">
          <label className="text-sm text-gray-400">Anzeigename
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </label>
          <label className="text-sm text-gray-400">Benutzername
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={username} onChange={e => setUsername(e.target.value)} />
          </label>
          {profileError && <div className="text-sm text-red-400">{profileError}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" className="pill">Speichern</button>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>
        </form>
      </div>

      <div className="card p-4 space-y-3 max-w-md">
        <h2 className="font-medium">UI</h2>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <span>Theme</span>
            <select value={theme} onChange={e => setTheme(e.target.value as 'dark' | 'bright')} className="bg-background border border-slate-700 rounded px-2 py-1">
              <option value="dark">Dark</option>
              <option value="bright">Bright</option>
            </select>
          </label>
          <button className="pill" onClick={saveUI}>Übernehmen</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-medium">Gewohnheiten</h2>
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <input className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm" placeholder="Neue Gewohnheit…" value={newHabit} onChange={e => setNewHabit(e.target.value)} />
            <button className="pill" onClick={addHabit} disabled={!newHabit.trim()}>Hinzufügen</button>
          </div>
          <ul className="space-y-2">
            {habits.map(h => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{h.title}</span>
                  <span className="ml-2 text-xs text-gray-400">{h.userId ? 'Eigen' : 'Standard'}</span>
                </div>
                <div>
                  <button className="pill" disabled={!h.userId} title={h.userId ? 'Löschen' : 'Standard-Gewohnheit kann nicht gelöscht werden'} onClick={() => deleteHabit(h.id, h.userId)}>
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-4 space-y-3 max-w-xl">
        <h2 className="font-medium">Erfassung</h2>
        <div className="grid gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <span>Autosave</span>
            <select value={String(autosaveEnabled)} onChange={e => setAutosaveEnabled(e.target.value === 'true')} className="bg-background border border-slate-700 rounded px-2 py-1">
              <option value="true">Aktiv</option>
              <option value="false">Inaktiv</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <span>Intervall (Sek.)</span>
            <input type="number" min={1} max={3600} value={autosaveIntervalSec} onChange={e => setAutosaveIntervalSec(Math.max(1, Math.min(3600, Number(e.target.value) || 1)))} className="w-28 bg-background border border-slate-700 rounded px-2 py-1" />
          </label>
          <div className="h-px bg-slate-800 my-2" />
          <div className="text-sm text-gray-400">Foto-Komprimierung & Auflösung (clientseitig, wird in diesem Browser gespeichert)</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-gray-400">Format</div>
              <select value={imageSettings.format} onChange={e => setImageSettings(s => ({ ...s, format: e.target.value as ImageSettings['format'] }))} className="w-full bg-background border border-slate-700 rounded px-2 py-1">
                <option value="webp">WebP (empfohlen)</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </label>
            <label className="text-sm">
              <div className="text-gray-400">Qualität</div>
              <input type="number" min={1} max={100} value={imageSettings.quality} onChange={e => setImageSettings(s => ({ ...s, quality: Math.max(1, Math.min(100, Number(e.target.value) || 80)) }))} className="w-full bg-background border border-slate-700 rounded px-2 py-1" />
            </label>
            <label className="text-sm">
              <div className="text-gray-400">Max. Breite</div>
              <input type="number" min={100} max={8000} value={imageSettings.maxWidth} onChange={e => setImageSettings(s => ({ ...s, maxWidth: Math.max(100, Math.min(8000, Number(e.target.value) || 1600)) }))} className="w-full bg-background border border-slate-700 rounded px-2 py-1" />
            </label>
            <label className="text-sm">
              <div className="text-gray-400">Max. Höhe</div>
              <input type="number" min={100} max={8000} value={imageSettings.maxHeight} onChange={e => setImageSettings(s => ({ ...s, maxHeight: Math.max(100, Math.min(8000, Number(e.target.value) || 1600)) }))} className="w-full bg-background border border-slate-700 rounded px-2 py-1" />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button className="pill" onClick={saveCapture}>Speichern</button>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>
        </div>
      </div>
    </div>
  )
}
