"use client"
import React, { useState } from 'react'
import { Icon } from '@/components/Icon'

export default function ExportPage() {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [withPhotos, setWithPhotos] = useState<boolean>(false)
  const [thumb, setThumb] = useState<number>(200)

  const clampedThumb = Math.max(50, Math.min(1000, Number(thumb) || 500))

  const openCsv = () => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const url = `/api/export/csv${p.toString() ? '?' + p.toString() : ''}`
    window.open(url, '_blank')
  }

  const openPdf = () => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    if (withPhotos) p.set('photos', 'true')
    if (withPhotos && clampedThumb) p.set('thumb', String(clampedThumb))
    const url = `/api/export/pdf${p.toString() ? '?' + p.toString() : ''}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        <span className="inline-flex items-center gap-1">
          <Icon name="share" />
          <span>Export</span>
        </span>
      </h1>

      <div className="card p-4 space-y-4 max-w-xl">
        <div className="text-sm text-gray-400">
          Von/Bis leer lassen, um alle Einträge zu exportieren.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-gray-400">Von</div>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-background border border-slate-700 rounded px-2 py-1" />
          </label>
          <label className="text-sm">
            <div className="text-gray-400">Bis</div>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-background border border-slate-700 rounded px-2 py-1" />
          </label>
          <label className="text-sm inline-flex items-center gap-2 mt-6 sm:mt-0">
            <input type="checkbox" checked={withPhotos} onChange={e => setWithPhotos(e.target.checked)} />
            <span>Fotos im PDF hinzufügen</span>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label className="text-sm">
            <div className="text-gray-400">Foto-Thumb (px, längste Seite)</div>
            <input
              type="number"
              min={50}
              max={1000}
              step={10}
              value={thumb}
              onChange={e => setThumb(Math.max(50, Math.min(1000, Number(e.target.value) || 500)))}
              className="w-full bg-background border border-slate-700 rounded px-2 py-1"
              disabled={!withPhotos}
            />
            <div className="text-xs text-gray-400 mt-1">Standard: 500 px (längste Seite). Nur aktiv, wenn „Fotos im PDF hinzufügen“ gewählt ist.</div>
          </label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button className="pill" onClick={openCsv}>CSV exportieren</button>
            <button className="pill" onClick={openPdf}>PDF exportieren</button>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          CSV enthält nur Zahlen (WBI, Stuhl, Habits, Symptome sowie eigene Habit-Spalten) je Tag. PDF enthält zusätzlich alle Notizen und optional Foto-Thumbnails.
        </div>
      </div>
    </div>
  )
}
