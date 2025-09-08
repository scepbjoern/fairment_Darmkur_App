"use client"
import React, { useEffect, useMemo, useState } from 'react'

type ReflectionKind = 'WEEK' | 'MONTH'

type Reflection = {
  id: string
  kind: ReflectionKind
  createdAtIso: string
  changed: string
  gratitude: string
  vows: string
  remarks: string
  photos: { id: string; url: string }[]
}

export default function ReflectionsPage() {
  const [kind, setKind] = useState<ReflectionKind>('WEEK')
  const [changed, setChanged] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [vows, setVows] = useState('')
  const [remarks, setRemarks] = useState('')
  const [list, setList] = useState<Reflection[]>([])

  async function load() {
    const res = await fetch('/api/reflections', { credentials: 'same-origin' })
    if (!res.ok) return
    const data = await res.json()
    setList(data.reflections || [])
  }

  useEffect(() => { load() }, [])

  async function addReflection() {
    const body = { kind, changed, gratitude, vows, remarks }
    const res = await fetch('/api/reflections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), credentials: 'same-origin'
    })
    const data = await res.json()
    if (data?.ok) {
      setChanged(''); setGratitude(''); setVows(''); setRemarks('')
      await load()
    }
  }

  async function uploadPhotos(reflectionId: string, files: FileList) {
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    // Append optional client-side image settings from localStorage for server-side processing
    try {
      const raw = localStorage.getItem('imageSettings')
      if (raw) {
        const s = JSON.parse(raw)
        if (s?.format) fd.append('imageFormat', String(s.format))
        if (s?.quality) fd.append('imageQuality', String(s.quality))
        if (s?.maxWidth) fd.append('imageMaxWidth', String(s.maxWidth))
        if (s?.maxHeight) fd.append('imageMaxHeight', String(s.maxHeight))
      }
    } catch {}
    const res = await fetch(`/api/reflections/${reflectionId}/photos`, { method: 'POST', body: fd, credentials: 'same-origin' })
    if (!res.ok) return
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-3">
        <h2 className="font-medium">Neue Reflexion</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <span>Typ</span>
            <select value={kind} onChange={e => setKind(e.target.value as ReflectionKind)} className="bg-background border border-slate-700 rounded px-2 py-1">
              <option value="WEEK">Wochenreflexion</option>
              <option value="MONTH">Monatsreflexion</option>
            </select>
          </label>
        </div>
        <div className="grid gap-2">
          <label className="block text-xs text-gray-400">Was hat sich verändert?
            <textarea value={changed} onChange={e => setChanged(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </label>
          <label className="block text-xs text-gray-400">Wofür bin ich dankbar?
            <textarea value={gratitude} onChange={e => setGratitude(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </label>
          <label className="block text-xs text-gray-400">Vorsätze
            <textarea value={vows} onChange={e => setVows(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </label>
          <label className="block text-xs text-gray-400">Sonstige Bemerkungen
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </label>
        </div>
        <div>
          <button className="pill" onClick={addReflection} disabled={!changed && !gratitude && !vows && !remarks}>Speichern</button>
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-sm text-gray-400">Noch keine Reflexionen.</div>
        ) : (
          <ul className="space-y-3">
            {list.map(r => (
              <li key={r.id} className={`p-3 rounded border ${r.kind === 'MONTH' ? 'border-blue-600/60 bg-blue-900/20' : 'border-emerald-600/60 bg-emerald-900/20'}`}>
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <div className="font-medium">{r.kind === 'MONTH' ? 'Monatsreflexion' : 'Wochenreflexion'}</div>
                  <div>{new Date(r.createdAtIso).toLocaleString()}</div>
                </div>
                <div className="mt-2 grid gap-2 text-sm">
                  {r.changed && <div><div className="text-gray-400 text-xs">Was hat sich verändert?</div><div className="whitespace-pre-wrap">{r.changed}</div></div>}
                  {r.gratitude && <div><div className="text-gray-400 text-xs">Wofür bin ich dankbar?</div><div className="whitespace-pre-wrap">{r.gratitude}</div></div>}
                  {r.vows && <div><div className="text-gray-400 text-xs">Vorsätze</div><div className="whitespace-pre-wrap">{r.vows}</div></div>}
                  {r.remarks && <div><div className="text-gray-400 text-xs">Sonstige Bemerkungen</div><div className="whitespace-pre-wrap">{r.remarks}</div></div>}
                </div>
                <div className="mt-2">
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.photos.map(p => (
                        <img key={p.id} src={`${p.url}?v=${p.id}`} alt="Foto" className="w-16 h-16 object-cover rounded border border-slate-700" />
                      ))}
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 text-xs text-gray-400 mt-2">
                    <span>Fotos hinzufügen</span>
                    <input type="file" accept="image/*" capture="environment" multiple onChange={e => { if (e.target.files && e.target.files.length > 0) uploadPhotos(r.id, e.target.files); e.currentTarget.value = '' }} />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
