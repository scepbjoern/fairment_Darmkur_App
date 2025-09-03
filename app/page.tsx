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
  text: string
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HeutePage() {
  const [date, setDate] = useState(() => ymd(new Date()))
  const [day, setDay] = useState<Day | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [notes, setNotes] = useState<DayNote[]>([])
  const [mealTime, setMealTime] = useState('')
  const [mealText, setMealText] = useState('')
  const { saving, savedAt, startSaving, doneSaving } = useSaveIndicator()

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/day?date=${date}`)
      const data = await res.json()
      setDay(data.day)
      setHabits(data.habits)
      setNotes(data.notes ?? [])
    }
    load()
  }, [date])

  async function updateDayMeta(patch: Partial<Pick<Day, 'phase' | 'careCategory' | 'notes'>>) {
    if (!day) return
    startSaving()
    const res = await fetch(`/api/day/${day.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
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
      body: JSON.stringify({ type: 'MEAL', time: mealTime || undefined, text: mealText.trim() }),
    })
    const data = await res.json()
    if (data?.notes) setNotes(data.notes)
    setMealText('')
    setMealTime('')
    doneSaving()
  }

  const symptoms = useMemo(() => Object.keys(SYMPTOM_LABELS), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Heute</h1>
        <div className="flex items-center gap-2">
          <button
            aria-label="Vorheriger Tag"
            className="pill"
            onClick={() => setDate(d => shiftDate(d, -1))}
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-surface border border-slate-700 rounded px-2 py-1 text-sm"
          />
          <button
            aria-label="Nächster Tag"
            className="pill"
            onClick={() => setDate(d => shiftDate(d, +1))}
          >
            ›
          </button>
        </div>
      </div>

      {day && (
        <>
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Phase</span>
                {[1, 2, 3].map(p => (
                  <button
                    key={p}
                    className={`pill ${day.phase === `PHASE_${p}` ? 'active' : ''}`}
                    onClick={() => updateDayMeta({ phase: `PHASE_${p}` as Day['phase'] })}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Kategorie</span>
                {(['SANFT', 'MEDIUM', 'INTENSIV'] as const).map(c => (
                  <button
                    key={c}
                    className={`pill ${day.careCategory === c ? 'active' : ''}`}
                    onClick={() => updateDayMeta({ careCategory: c })}
                  >
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>

          <div className="card p-4 space-y-4">
            <h2 className="font-medium">Symptome</h2>
            <div className="space-y-3">
              {symptoms.map(type => (
                <div key={type} className="space-y-1">
                  <div className="text-sm text-gray-400">{SYMPTOM_LABELS[type]}</div>
                  <NumberPills
                    min={1}
                    max={10}
                    value={day.symptoms[type]}
                    onChange={n => updateSymptom(type, n)}
                    ariaLabel={SYMPTOM_LABELS[type]}
                  />
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
            <textarea
              className="w-full bg-background border border-slate-700 rounded p-2"
              rows={4}
              placeholder="Freitext…"
              defaultValue={day.notes ?? ''}
              onBlur={e => updateDayMeta({ notes: e.target.value })}
            />
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="font-medium">Ernährungsnotizen</h2>
            <div className="space-y-2">
              {notes.filter(n => n.type === 'MEAL').length === 0 ? (
                <div className="text-sm text-gray-400">Noch keine Einträge.</div>
              ) : (
                <ul className="space-y-2">
                  {notes
                    .filter(n => n.type === 'MEAL')
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map(n => (
                      <li key={n.id} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-400 w-12">{n.time || '—'}</span>
                        <span className="flex-1">{n.text}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={mealTime}
                onChange={e => setMealTime(e.target.value)}
                className="bg-background border border-slate-700 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={mealText}
                onChange={e => setMealText(e.target.value)}
                placeholder="Beschreibung…"
                className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-sm"
              />
              <button className="pill" onClick={addMealNote} disabled={!mealText.trim()}>
                Hinzufügen
              </button>
            </div>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>
        </>
      )}
    </div>
  )
}
