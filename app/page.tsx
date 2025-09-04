"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { NumberPills } from '@/components/NumberPills'
import { HabitChips } from '@/components/HabitChips'
import { SaveIndicator, useSaveIndicator } from '@/components/SaveIndicator'

const SYMPTOM_LABELS: Record<string, string> = {
  BESCHWERDEFREIHEIT: 'Beschwerdefreiheit',
  ENERGIE: 'Energielevel',
  STIMMUNG: 'Stimmung',
  SCHLAF: 'Schlaf',
  ENTSPANNUNG: 'Zeit für Entspannung',
  HEISSHUNGERFREIHEIT: 'Heißhungerfreiheit',
  BEWEGUNG: 'Bewegungslevel',
}

type Day = {
  id: string
  date: string
  phase: 'PHASE_1' | 'PHASE_2' | 'PHASE_3'
  careCategory: 'SANFT' | 'MEDIUM' | 'INTENSIV'
  notes?: string
  symptoms: Record<string, number | undefined>
  stool?: number
  habitTicks: { habitId: string; checked: boolean }[]
}

type Habit = { id: string; title: string }

type DayNote = {
  id: string
  dayId: string
  type: 'MEAL' | 'REFLECTION'
  time?: string
  techTime?: string
  text: string
  photos?: { id: string; url: string }[]
  occurredAtIso?: string
  createdAtIso?: string
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtHMLocal(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Simple calendar that shows current month and highlights days with data
function Calendar(props: { date: string; daysWithData: Set<string>; onSelect: (d: string) => void }) {
  const { date, daysWithData, onSelect } = props
  const [y, m, d] = date.split('-').map(n => parseInt(n, 10))
  const firstOfMonth = new Date(y, (m || 1) - 1, 1)
  const startWeekDay = (firstOfMonth.getDay() + 6) % 7 // 0=Mon
  const daysInMonth = new Date(y, (m || 1), 0).getDate()
  const cells: { ymd: string | null; inMonth: boolean }[] = []
  // leading blanks
  for (let i = 0; i < startWeekDay; i++) cells.push({ ymd: null, inMonth: false })
  // month days
  for (let day = 1; day <= daysInMonth; day++) {
    const ymdStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ ymd: ymdStr, inMonth: true })
  }
  // pad to complete weeks
  while (cells.length % 7 !== 0) cells.push({ ymd: null, inMonth: false })

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-gray-400">
        {weekDays.map(wd => (
          <div key={wd} className="text-center">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c.ymd) return <div key={idx} className="h-8 rounded bg-transparent" />
          const isSelected = c.ymd === date
          const hasData = daysWithData.has(c.ymd)
          return (
            <button
              key={c.ymd}
              className={`h-8 rounded border text-xs flex items-center justify-center ${
                isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface border-slate-700 hover:border-slate-500'
              }`}
              onClick={() => onSelect(c.ymd!)}
              title={c.ymd}
            >
              <span className="relative">
                {parseInt(c.ymd.split('-')[2], 10)}
                {hasData && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function HeutePage() {
  const [date, setDate] = useState(() => ymd(new Date()))
  const [day, setDay] = useState<Day | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [notes, setNotes] = useState<DayNote[]>([])
  const [daysWithData, setDaysWithData] = useState<Set<string>>(new Set())
  const [mealTime, setMealTime] = useState('')
  const [mealText, setMealText] = useState('')
  const { saving, savedAt, startSaving, doneSaving } = useSaveIndicator()
  const [viewer, setViewer] = useState<{ noteId: string; index: number } | null>(null)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)

  const goViewer = (delta: number) => {
    setViewer(v => {
      if (!v) return null
      const note = notes.find(nn => nn.id === v.noteId)
      const photos = note?.photos || []
      if (photos.length === 0) return v
      const nextIdx = (v.index + delta + photos.length) % photos.length
      return { ...v, index: nextIdx }
    })
  }

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/day?date=${date}`, { credentials: 'same-origin' })
      const data = await res.json()
      setDay(data.day)
      setHabits(data.habits)
      setNotes(data.notes ?? [])
      // Prefill current time (HH:MM) when date changes or page loads
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setMealTime(`${hh}:${mm}`)
    }
    load()
  }, [date])

  // Load calendar markers for the current month of the selected date
  useEffect(() => {
    const [y, m] = date.split('-')
    const ym = `${y}-${m}`
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch(`/api/calendar?month=${ym}`, { credentials: 'same-origin' })
        if (!res.ok) return
        const data = await res.json()
        if (!aborted) setDaysWithData(new Set<string>(data?.days ?? []))
      } catch {
        // ignore
      }
    })()
    return () => { aborted = true }
  }, [date])

  async function uploadPhotos(noteId: string, files: FileList) {
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('files', f))
      const res = await fetch(`/api/notes/${noteId}/photos`, { method: 'POST', body: formData, credentials: 'same-origin' })
      const data = await res.json()
      if (data?.notes) setNotes(data.notes)
    } catch (e) {
      console.error('Upload failed', e)
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (data?.ok) {
        setNotes(prev => prev.map(n => ({ ...n, photos: (n.photos || []).filter(p => p.id !== photoId) })))
      }
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  async function updateDayMeta(patch: Partial<Pick<Day, 'phase' | 'careCategory' | 'notes'>>) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    doneSaving()
  }

  async function updateSymptom(type: string, score: number) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/symptoms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, score }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    doneSaving()
  }

  async function updateStool(bristol: number) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/stool`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bristol }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    doneSaving()
  }

  async function toggleHabit(habitId: string, checked: boolean) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/habit-ticks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, checked }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    setDay(data.day)
    doneSaving()
  }

  function shiftDate(cur: string, delta: number) {
    const [y, m, d] = cur.split('-').map(Number)
    const dt = new Date(y, (m || 1) - 1, d || 1)
    dt.setDate(dt.getDate() + delta)
    return ymd(dt)
  }

  async function addMealNote() {
    if (!day || !mealText.trim()) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'MEAL',
        time: mealTime || undefined,
        text: mealText.trim(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    if (data?.notes) setNotes(data.notes)
    setMealText('')
    // Refill with current time for quick subsequent entries
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setMealTime(`${hh}:${mm}`)
    doneSaving()
  }

  const symptoms = useMemo(() => Object.keys(SYMPTOM_LABELS), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tagebuch</h1>
        <div className="flex items-center gap-2">
          <button aria-label="Vorheriger Tag" className="pill" onClick={() => setDate(d => shiftDate(d, -1))}>‹</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-surface border border-slate-700 rounded px-2 py-1 text-sm" />
          <button aria-label="Nächster Tag" className="pill" onClick={() => setDate(d => shiftDate(d, +1))}>›</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-medium">Kalender</h2>
        <Calendar date={date} daysWithData={daysWithData} onSelect={(d) => setDate(d)} />
      </div>

      {day && (
        <>
          <div className="card p-4 space-y-3">
            <h2 className="font-medium">Tages-Einstellungen</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Phase</span>
              {[1, 2, 3].map(p => {
                const key = `PHASE_${p}` as Day['phase']
                return (
                  <button key={key} className={`pill ${day.phase === key ? 'active' : ''}`} onClick={() => updateDayMeta({ phase: key })}>
                    {p}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Kategorie</span>
              {(['SANFT', 'MEDIUM', 'INTENSIV'] as const).map(c => (
                <button key={c} className={`pill ${day.careCategory === c ? 'active' : ''}`} onClick={() => updateDayMeta({ careCategory: c })}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>

          <div className="card p-4 space-y-4">
            <h2 className="font-medium">Symptome</h2>
            <div className="space-y-3">
              {symptoms.map(type => (
                <div key={type} className="space-y-1">
                  <div className="text-sm text-gray-400">{SYMPTOM_LABELS[type]}</div>
                  <NumberPills min={1} max={10} value={day.symptoms[type]} onChange={n => updateSymptom(type, n)} ariaLabel={SYMPTOM_LABELS[type]} />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="font-medium">Stuhl (Bristol 1–7)</h2>
            <NumberPills min={1} max={7} value={day.stool} onChange={updateStool} ariaLabel="Bristol" />
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="font-medium">Habits</h2>
            <HabitChips habits={habits} ticks={day.habitTicks} onToggle={toggleHabit} />
          </div>

          <div className="card p-4 space-y-2">
            <h2 className="font-medium">Bemerkungen</h2>
            <textarea className="w-full bg-background border border-slate-700 rounded p-2" rows={4} placeholder="Freitext…" defaultValue={day.notes ?? ''} onBlur={e => updateDayMeta({ notes: e.target.value })} />
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="font-medium">Ernährungsnotizen</h2>
            <div className="space-y-2">
              {notes.filter(n => n.type === 'MEAL').length === 0 ? (
                <div className="text-sm text-gray-400">Noch keine Einträge.</div>
              ) : (
                <ul className="space-y-3">
                  {notes
                    .filter(n => n.type === 'MEAL')
                    .sort((a, b) => (a.occurredAtIso || '').localeCompare(b.occurredAtIso || ''))
                    .map(n => (
                      <li key={n.id} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-400 w-28">{fmtHMLocal(n.occurredAtIso) + (n.createdAtIso ? ` (${fmtHMLocal(n.createdAtIso)})` : '')}</span>
                        <div className="flex-1 space-y-2">
                          <div className="whitespace-pre-wrap text-xs leading-5">{n.text}</div>
                          {n.photos && n.photos.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {n.photos.map((p, idx) => (
                                <div key={p.id} className="relative group">
                                  <img src={`${p.url}?v=${p.id}`} alt="Foto" className="w-16 h-16 object-cover rounded border border-slate-700 cursor-zoom-in" onClick={() => setViewer({ noteId: n.id, index: idx })} />
                                  <button className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100" title="Foto löschen" onClick={e => { e.stopPropagation(); deletePhoto(p.id) }}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <label className="inline-flex items-center gap-2 text-xs text-gray-400">
                              <span>Fotos hinzufügen</span>
                              <input type="file" accept="image/*" multiple onChange={e => { if (e.target.files && e.target.files.length > 0) uploadPhotos(n.id, e.target.files); e.currentTarget.value = '' }} />
                            </label>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="flex items-start gap-2">
              <input type="time" value={mealTime} onChange={e => setMealTime(e.target.value)} className="bg-background border border-slate-700 rounded px-2 py-1 text-sm" />
              <textarea value={mealText} onChange={e => setMealText(e.target.value)} placeholder="Beschreibung…" className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm" rows={3} />
              <button className="pill" onClick={addMealNote} disabled={!mealText.trim()}>Hinzufügen</button>
            </div>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>
        </>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewer(null)} onTouchStart={e => setSwipeStartX(e.touches?.[0]?.clientX ?? null)} onTouchEnd={e => {
          const x = e.changedTouches?.[0]?.clientX
          if (swipeStartX != null && typeof x === 'number') {
            const dx = x - swipeStartX
            if (Math.abs(dx) > 40) {
              if (dx < 0) goViewer(1)
              else goViewer(-1)
            }
          }
          setSwipeStartX(null)
        }}>
          {(() => {
            const note = notes.find(nn => nn.id === viewer.noteId)
            const photos = note?.photos || []
            const current = photos[viewer.index]
            if (!current) return null
            return (
              <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <img src={`${current.url}?v=${current.id}`} alt="Foto" className="max-w-[90vw] max-h-[90vh] object-contain" />
                <button aria-label="Vorheriges Foto" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" onClick={() => goViewer(-1)}>‹</button>
                <button aria-label="Nächstes Foto" className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" onClick={() => goViewer(1)}>›</button>
                <button aria-label="Schließen" className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10" onClick={() => setViewer(null)}>×</button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
