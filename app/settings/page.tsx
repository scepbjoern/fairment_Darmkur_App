"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SaveIndicator, useSaveIndicator } from '@/components/SaveIndicator'
import { Icon } from '@/components/Icon'
import { useRouter } from 'next/navigation'

type Me = {
  id: string
  username: string
  displayName: string | null
  profileImageUrl?: string | null
  settings: {
    theme: 'dark' | 'bright'
    autosaveEnabled: boolean
    autosaveIntervalSec: number
    timeFormat24h: boolean
    weekStart: string
  } | null
}

type Habit = { id: string; title: string; userId: string | null; icon?: string | null }

type ImageSettings = {
  format: 'webp' | 'png' | 'jpeg'
  quality: number
  maxWidth: number
  maxHeight: number
}

type UserLink = { id: string; name: string; url: string }
type UserSymptom = { id: string; title: string; icon?: string | null }

const STD_SYMPTOM_LABELS: Record<string, string> = {
  BESCHWERDEFREIHEIT: 'Beschwerdefreiheit',
  ENERGIE: 'Energielevel',
  STIMMUNG: 'Stimmung',
  SCHLAF: 'Schlaf',
  ENTSPANNUNG: 'Zeit für Entspannung',
  HEISSHUNGERFREIHEIT: 'Heißhungerfreiheit',
  BEWEGUNG: 'Bewegungslevel',
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
  const [links, setLinks] = useState<UserLink[]>([])
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [userSymptoms, setUserSymptoms] = useState<UserSymptom[]>([])
  const [newUserSymptom, setNewUserSymptom] = useState('')
  const [newUserSymptomIcon, setNewUserSymptomIcon] = useState('')
  const [newHabitIcon, setNewHabitIcon] = useState('')
  const [habitIconDrafts, setHabitIconDrafts] = useState<Record<string, string>>({})
  const [userSymptomIconDrafts, setUserSymptomIconDrafts] = useState<Record<string, string>>({})
  const [stdSymptomIcons, setStdSymptomIcons] = useState<Record<string, string | null>>({})
  const [stdSymptomIconDrafts, setStdSymptomIconDrafts] = useState<Record<string, string>>({})

  // Avatar cropper state
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarScale, setAvatarScale] = useState(1)
  const [avatarOffset, setAvatarOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [lastPt, setLastPt] = useState<{ x: number; y: number } | null>(null)

  // Export state (currently unused; keep for future use)
  const [_expFrom, _setExpFrom] = useState<string>('')
  const [_expTo, _setExpTo] = useState<string>('')
  const [_expPhotos, _setExpPhotos] = useState<boolean>(false)

  async function load() {
    try {
      const [meRes, habitsRes, linksRes, userSymptomsRes, stdSymIconsRes] = await Promise.all([
        fetch('/api/me', { credentials: 'same-origin' }),
        fetch('/api/habits', { credentials: 'same-origin' }),
        fetch('/api/links', { credentials: 'same-origin' }),
        fetch('/api/user-symptoms', { credentials: 'same-origin' }),
        fetch('/api/symptom-icons', { credentials: 'same-origin' }),
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
      if (linksRes.ok) {
        const data = await linksRes.json()
        setLinks(Array.isArray(data.links) ? data.links : [])
      }
      if (userSymptomsRes.ok) {
        const data = await userSymptomsRes.json()
        setUserSymptoms(Array.isArray(data.symptoms) ? data.symptoms : [])
      }
      if (stdSymIconsRes.ok) {
        const data = await stdSymIconsRes.json()
        setStdSymptomIcons(data.icons || {})
      }
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

  async function saveHabitIcon(id: string, icon: string) {
    try {
      startSaving()
      const res = await fetch(`/api/habits/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon }), credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        const r = await fetch('/api/habits', { credentials: 'same-origin' })
        const dd = await r.json()
        setHabits(dd.habits || [])
        setHabitIconDrafts(d => ({ ...d, [id]: '' }))
      }
    } finally {
      doneSaving()
    }
  }

  async function saveUserSymptomIcon(id: string, icon: string) {
    try {
      startSaving()
      const res = await fetch(`/api/user-symptoms/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon }), credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        setUserSymptoms(list => list.map(s => s.id === id ? { ...s, icon: icon || null } : s))
        setUserSymptomIconDrafts(d => ({ ...d, [id]: '' }))
      }
    } finally {
      doneSaving()
    }
  }

  async function saveStdSymptomIcon(type: string, icon: string) {
    try {
      startSaving()
      const res = await fetch('/api/symptom-icons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, icon }), credentials: 'same-origin' })
      await res.json().catch(() => ({}))
      if (res.ok) {
        setStdSymptomIcons(m => ({ ...m, [type]: icon || null }))
        setStdSymptomIconDrafts(d => ({ ...d, [type]: '' }))
      }
    } finally {
      doneSaving()
    }
  }

  function openAvatarDialog() {
    setAvatarOpen(true)
    setAvatarImg(null)
    setAvatarUrl(null)
    setAvatarScale(1)
    setAvatarOffset({ x: 0, y: 0 })
  }

  function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => { setAvatarImg(img) }
    img.src = url
    setAvatarUrl(url)
  }

  function onAvatarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(true)
    setLastPt({ x: e.clientX, y: e.clientY })
  }
  function onAvatarPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !lastPt) return
    const dx = e.clientX - lastPt.x
    const dy = e.clientY - lastPt.y
    setAvatarOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    setLastPt({ x: e.clientX, y: e.clientY })
  }
  function onAvatarPointerUp() {
    setDragging(false)
    setLastPt(null)
  }

  // Preview size measured from DOM to guarantee 1:1 crop regardless of rem/zoom
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [previewSize, setPreviewSize] = useState<number>(256)
  useEffect(() => {
    function update() {
      const el = previewRef.current
      if (el) setPreviewSize(Math.max(1, Math.round(el.clientWidth)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [avatarOpen])

  // Compute preview transform to match saveAvatar()
  const preview = useMemo(() => {
    if (!avatarImg) return null
    const ps = previewSize
    const baseScale = Math.max(ps / avatarImg.naturalWidth, ps / avatarImg.naturalHeight)
    const S = baseScale * avatarScale
    const width = avatarImg.naturalWidth * S
    const height = avatarImg.naturalHeight * S
    const left = ps / 2 - width / 2 + avatarOffset.x
    const top = ps / 2 - height / 2 + avatarOffset.y
    return { width, height, left, top }
  }, [avatarImg, avatarScale, avatarOffset, previewSize])

  async function saveAvatar() {
    if (!avatarImg) return
    // Create 512x512 canvas crop using current scale/offset
    const CANVAS_SIZE = 512
    const ps = previewSize // must match preview container pixel size
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    // Compute effective scale to cover preview container at base scale 1
    const baseScale = Math.max(ps / avatarImg.naturalWidth, ps / avatarImg.naturalHeight)
    const S = baseScale * avatarScale
    // Image top-left in preview coords
    const left = ps / 2 - (avatarImg.naturalWidth * S) / 2 + avatarOffset.x
    const top = ps / 2 - (avatarImg.naturalHeight * S) / 2 + avatarOffset.y
    // Visible crop in source image
    let sx = (-left) / S
    let sy = (-top) / S
    let sw = ps / S
    let sh = ps / S
    // Clamp to image bounds
    if (sx < 0) { sw += sx; sx = 0 }
    if (sy < 0) { sh += sy; sy = 0 }
    if (sx + sw > avatarImg.naturalWidth) sw = avatarImg.naturalWidth - sx
    if (sy + sh > avatarImg.naturalHeight) sh = avatarImg.naturalHeight - sy
    if (sw <= 0 || sh <= 0) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(avatarImg, sx, sy, sw, sh, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b as Blob), 'image/webp', 0.9)!)
    const form = new FormData()
    form.append('file', blob, 'avatar.webp')
    try {
      const r = await fetch('/api/me/avatar', { method: 'POST', body: form })
      const j = await r.json()
      if (r.ok && j?.ok) {
        setMe(m => m ? { ...m, profileImageUrl: j.url } : m)
        setAvatarOpen(false)
        if (avatarUrl) { try { URL.revokeObjectURL(avatarUrl) } catch {} }
      }
    } catch {}
  }

  async function deleteAvatar() {
    try {
      const r = await fetch('/api/me/avatar', { method: 'DELETE' })
      await r.json().catch(() => ({}))
      if (r.ok) setMe(m => m ? { ...m, profileImageUrl: null } : m)
    } catch {}
  }

  async function addUserSymptom() {
    const title = newUserSymptom.trim()
    if (!title) return
    try {
      const res = await fetch('/api/user-symptoms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, icon: newUserSymptomIcon || null }), credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data?.ok) {
        const r = await fetch('/api/user-symptoms', { credentials: 'same-origin' })
        const dd = await r.json()
        setUserSymptoms(Array.isArray(dd.symptoms) ? dd.symptoms : [])
        setNewUserSymptom('')
        setNewUserSymptomIcon('')
      }
    } catch {}
  }

  async function deleteUserSymptom(id: string) {
    if (!id) return
    try {
      const res = await fetch(`/api/user-symptoms/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data?.ok) {
        setUserSymptoms(list => list.filter(s => s.id !== id))
      }
    } catch {}
  }

  useEffect(() => { load() }, [])

  async function addLink() {
    const name = newLinkName.trim()
    const url = newLinkUrl.trim()
    if (!name || !url) return
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (res.ok && data?.ok) {
        try {
          const r = await fetch('/api/links', { credentials: 'same-origin' })
          if (r.ok) {
            const dd = await r.json()
            setLinks(Array.isArray(dd.links) ? dd.links : [])
          }
        } catch {}
        setNewLinkName('')
        setNewLinkUrl('')
      }
    } catch {}
  }

  async function deleteLink(id: string) {
    if (!id) return
    try {
      const res = await fetch(`/api/links/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data?.ok) {
        setLinks(ls => ls.filter(l => l.id !== id))
      }
    } catch {}
  }


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
      const res = await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, icon: newHabitIcon || null }), credentials: 'same-origin' })
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
        setNewHabitIcon('')
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
    <>
      <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        <span className="inline-flex items-center gap-1">
          <Icon name="settings" />
          <span>Einstellungen</span>
        </span>
      </h1>

      <div className="card p-4 space-y-3">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="manage_accounts" />
            <span>Profil</span>
          </span>
        </h2>
        <form onSubmit={saveProfile} className="grid gap-3 max-w-md">
          <label className="text-sm text-gray-400">Anzeigename
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </label>
          <label className="text-sm text-gray-400">Benutzername
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={username} onChange={e => setUsername(e.target.value)} />
          </label>
          {profileError && <div className="text-sm text-red-400">{profileError}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" className="pill !bg-green-600 !text-white hover:bg-pill-light dark:hover:bg-pill hover:text-gray-900 dark:hover:text-gray-100">Speichern</button>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>

      
        </form>
        {/* Avatar controls */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-700 bg-surface flex items-center justify-center">
            {me?.profileImageUrl ? (
              <img src={me.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-gray-300 font-semibold">{(displayName || username || '?').slice(0,1).toUpperCase()}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="pill" onClick={openAvatarDialog}>Profilbild ändern</button>
            {me?.profileImageUrl && <button className="pill" onClick={deleteAvatar}>Entfernen</button>}
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3 max-w-md">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="palette" />
            <span>UI</span>
          </span>
        </h2>
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
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="checklist" />
            <span>Gewohnheiten</span>
          </span>
        </h2>
        <div className="max-w-xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <label className="md:col-span-4 text-sm">
              <div className="text-gray-400">Name</div>
              <input className="w-full bg-background border border-slate-700 rounded px-2 py-1 text-sm" placeholder="Neue Gewohnheit…" value={newHabit} onChange={e => setNewHabit(e.target.value)} />
            </label>
            <label className="text-sm">
              <div className="text-gray-400">Icon (Emoji oder Symbol)</div>
              <input className="w-full bg-background border border-slate-700 rounded px-2 py-1 text-sm" placeholder="z. B. 😊 oder fitness_center" value={newHabitIcon} onChange={e => setNewHabitIcon(e.target.value)} />
            </label>
            <div>
              <button className="pill" onClick={addHabit} disabled={!newHabit.trim()}>Hinzufügen</button>
            </div>
          </div>
          <ul className="space-y-2">
            {habits.map(h => (
              <li key={h.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6">{h.icon ? <Icon name={h.icon} /> : null}</span>
                    <span className="font-medium">{h.title}</span>
                    <span className="ml-2 text-xs text-gray-400">{h.userId ? 'Eigen' : 'Standard'}</span>
                  </div>
                  {h.userId && (
                    <div className="flex items-center gap-2">
                      <button className="pill" title="Löschen" aria-label="Löschen" onClick={() => deleteHabit(h.id, h.userId)}>
                        <Icon name="delete" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-2">
                  <label className="md:col-span-4 text-xs">
                    <div className="text-gray-400">Icon (Emoji oder Symbol)</div>
                    <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={habitIconDrafts[h.id] ?? (h.icon ?? '')} onChange={e => setHabitIconDrafts(d => ({ ...d, [h.id]: e.target.value }))} placeholder="z. B. 😊 oder fitness_center" />
                  </label>
                  <div className="flex items-end gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface border border-slate-700"><Icon name={(habitIconDrafts[h.id] ?? h.icon) || ''} /></span>
                    <button className="pill" title="Icon speichern" aria-label="Icon speichern" onClick={() => saveHabitIcon(h.id, habitIconDrafts[h.id] ?? (h.icon ?? ''))}>
                      <Icon name="save" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-4 space-y-3 max-w-xl">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="tune" />
            <span>Erfassung</span>
          </span>
        </h2>
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
            <button className="pill !bg-green-600 !text-white hover:bg-pill-light dark:hover:bg-pill hover:text-gray-900 dark:hover:text-gray-100" onClick={saveCapture}>Speichern</button>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3 max-w-xl">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="stethoscope" />
            <span>Symptome</span>
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <label className="md:col-span-4 text-sm">
            <div className="text-gray-400">Name</div>
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={newUserSymptom} onChange={e => setNewUserSymptom(e.target.value)} placeholder="z. B. Kopfschmerzen" />
          </label>
          <label className="text-sm">
            <div className="text-gray-400">Icon (Emoji oder Symbol)</div>
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={newUserSymptomIcon} onChange={e => setNewUserSymptomIcon(e.target.value)} placeholder="z. B. 😊 oder mood" />
          </label>
          <div>
            <button className="pill" onClick={addUserSymptom} disabled={!newUserSymptom.trim()}>Hinzufügen</button>
          </div>
        </div>
        <ul className="space-y-2">
          {Object.entries(STD_SYMPTOM_LABELS).map(([type, label]) => {
            const current = stdSymptomIconDrafts[type] ?? (stdSymptomIcons[type] ?? '')
            return (
              <li key={`std-${type}`} className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6"><Icon name={current} /></span>
                    <span className="font-medium">{label}</span>
                    <span className="ml-2 text-xs text-gray-400">Standard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs">
                      <input className="w-44 bg-background border border-slate-700 rounded px-2 py-1" value={current} onChange={e => setStdSymptomIconDrafts(d => ({ ...d, [type]: e.target.value }))} placeholder="Emoji/Symbol" />
                    </label>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface border border-slate-700"><Icon name={current || ''} /></span>
                    <button className="pill" title="Icon speichern" aria-label="Icon speichern" onClick={() => saveStdSymptomIcon(type, current)}>
                      <Icon name="save" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
          {userSymptoms.map(s => {
            const current = userSymptomIconDrafts[s.id] ?? (s.icon ?? '')
            return (
              <li key={`usr-${s.id}`} className="text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="inline-flex items-center justify-center w-6">{current ? <Icon name={current} /> : null}</span>
                    <span className="font-medium">{s.title}</span>
                    <span className="ml-2 text-xs text-gray-400">Eigen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs">
                      <input className="w-44 bg-background border border-slate-700 rounded px-2 py-1" value={current} onChange={e => setUserSymptomIconDrafts(d => ({ ...d, [s.id]: e.target.value }))} placeholder="Emoji/Symbol" />
                    </label>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface border border-slate-700"><Icon name={current || ''} /></span>
                    <button className="pill" title="Icon speichern" aria-label="Icon speichern" onClick={() => saveUserSymptomIcon(s.id, current)}>
                      <Icon name="save" />
                    </button>
                    <button className="pill" title="Löschen" aria-label="Löschen" onClick={() => deleteUserSymptom(s.id)}>
                      <Icon name="delete" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="card p-4 space-y-3 max-w-xl">
        <h2 className="font-medium">
          <span className="inline-flex items-center gap-1">
            <Icon name="add_link" />
            <span>Links</span>
          </span>
        </h2>
        <div className="text-sm text-gray-400">Hier kannst du eigene Links anlegen, die im Menü unter „Links“ erscheinen.</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <label className="md:col-span-2 text-sm">
            <div className="text-gray-400">Name</div>
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="z. B. Blog" />
          </label>
          <label className="md:col-span-3 text-sm">
            <div className="text-gray-400">URL</div>
            <input className="w-full bg-background border border-slate-700 rounded px-2 py-1" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://… oder /docs/…" />
          </label>
          <div>
            <button className="pill" onClick={addLink} disabled={!newLinkName.trim() || !newLinkUrl.trim()}>Hinzufügen</button>
          </div>
        </div>
        <ul className="space-y-2">
          {links.length === 0 ? (
            <li className="text-sm text-gray-400">Noch keine eigenen Links.</li>
          ) : (
            links.map(l => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <div className="truncate">
                  <span className="font-medium">{l.name}</span>
                  <span className="ml-2 text-xs text-gray-400 truncate">{l.url}</span>
                </div>
                <button className="pill" onClick={() => deleteLink(l.id)}>Löschen</button>
              </li>
            ))
          )}
        </ul>
      </div>
      
    </div>
    {avatarOpen && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAvatarOpen(false)}>
        <div className="bg-surface border border-slate-800 rounded-xl p-4 w-[360px]" onClick={e => e.stopPropagation()}>
          <div className="text-sm font-medium mb-2">Profilbild zuschneiden</div>
          <div
            className="relative mx-auto mb-3 h-64 w-64 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 touch-none select-none"
            ref={previewRef}
            onPointerDown={onAvatarPointerDown}
            onPointerMove={onAvatarPointerMove}
            onPointerUp={onAvatarPointerUp}
            onPointerCancel={onAvatarPointerUp}
          >
            {avatarUrl ? (
              // Preview via background image
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${avatarUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: `${preview?.left ?? 0}px ${preview?.top ?? 0}px`,
                  backgroundSize: preview ? `${preview.width}px ${preview.height}px` : undefined,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Bild wählen…</div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input type="range" min={1} max={3} step={0.01} value={avatarScale} onChange={e => setAvatarScale(Number(e.target.value))} className="flex-1" />
            <span className="text-xs text-gray-400 w-10 text-right">{avatarScale.toFixed(2)}×</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="pill cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />Bild wählen
            </label>
            <div className="flex items-center gap-2">
              <button className="pill" onClick={() => setAvatarOpen(false)}>Abbrechen</button>
              <button className="pill !bg-green-600 !text-white hover:bg-pill-light dark:hover:bg-pill hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-60" onClick={saveAvatar} disabled={!avatarImg}>Zuschneiden & Speichern</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
