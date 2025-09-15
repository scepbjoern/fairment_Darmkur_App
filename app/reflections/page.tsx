"use client"
import React, { useEffect, useState } from 'react'
import { CameraPicker } from '@/components/CameraPicker'
import { MicrophoneButton } from '@/components/MicrophoneButton'

type ReflectionKind = 'WEEK' | 'MONTH'

type Reflection = {
  id: string
  kind: ReflectionKind
  createdAtIso: string
  changed: string
  gratitude: string
  vows: string
  remarks: string
  weightKg?: number
  photos: { id: string; url: string }[]
}

export default function ReflectionsPage() {
  const [kind, setKind] = useState<ReflectionKind>('WEEK')
  const [changed, setChanged] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [vows, setVows] = useState('')
  const [remarks, setRemarks] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [list, setList] = useState<Reflection[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eChanged, setEChanged] = useState('')
  const [eGratitude, setEGratitude] = useState('')
  const [eVows, setEVows] = useState('')
  const [eRemarks, setERemarks] = useState('')
  const [eWeightKg, setEWeightKg] = useState('')

  async function load() {
    const res = await fetch('/api/reflections', { credentials: 'same-origin' })
    if (!res.ok) return
    const data = await res.json()
    setList(data.reflections || [])
  }

  function startEdit(r: Reflection) {
    setEditingId(r.id)
    setEChanged(r.changed || '')
    setEGratitude(r.gratitude || '')
    setEVows(r.vows || '')
    setERemarks(r.remarks || '')
    setEWeightKg(
      typeof r.weightKg === 'number'
        ? r.weightKg.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : ''
    )
  }

  function cancelEdit() {
    setEditingId(null)
    setEChanged('')
    setEGratitude('')
    setEVows('')
    setERemarks('')
    setEWeightKg('')
  }

  async function saveEdit() {
    if (!editingId) return
    const res = await fetch(`/api/reflections/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changed: eChanged, gratitude: eGratitude, vows: eVows, remarks: eRemarks, weightKg: eWeightKg }),
      credentials: 'same-origin',
    })
    if (res.ok) {
      await load()
      cancelEdit()
    }
  }

  async function deleteReflection(id: string) {
    if (!confirm('Reflexion wirklich löschen?')) return
    const res = await fetch(`/api/reflections/${id}`, { method: 'DELETE', credentials: 'same-origin' })
    if (res.ok) {
      await load()
      if (editingId === id) cancelEdit()
    }
  }

  useEffect(() => { load() }, [])

  async function addReflection() {
    const body = { kind, changed, gratitude, vows, remarks, weightKg }
    const res = await fetch('/api/reflections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), credentials: 'same-origin'
    })
    const data = await res.json()
    if (data?.ok) {
      setChanged(''); setGratitude(''); setVows(''); setRemarks(''); setWeightKg('')
      await load()
    }
  }

  async function uploadPhotos(reflectionId: string, files: FileList | File[]) {
    const fd = new FormData()
    if ((files as FileList).length !== undefined && typeof (files as FileList).item === 'function') {
      Array.from(files as FileList).forEach(f => fd.append('files', f))
    } else {
      (files as File[]).forEach(f => fd.append('files', f))
    }
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
        <div className="grid gap-3">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Was hat sich verändert?</span>
              <MicrophoneButton onText={(t) => setChanged(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
            </div>
            <textarea value={changed} onChange={e => setChanged(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Wofür bin ich dankbar?</span>
              <MicrophoneButton onText={(t) => setGratitude(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
            </div>
            <textarea value={gratitude} onChange={e => setGratitude(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Vorsätze</span>
              <MicrophoneButton onText={(t) => setVows(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
            </div>
            <textarea value={vows} onChange={e => setVows(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Sonstige Bemerkungen</span>
              <MicrophoneButton onText={(t) => setRemarks(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
            </div>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Körpergewicht (kg) — optional (Format 0,0)</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.,]*"
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
              className="w-full bg-background border border-slate-700 rounded p-2"
              placeholder="z. B. 72,5"
            />
          </div>
        </div>
        <div>
          <button className="pill" onClick={addReflection} disabled={!changed && !gratitude && !vows && !remarks && !weightKg.trim()}>Speichern</button>
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
                  <div className="flex items-center gap-2">
                    <span>{new Date(r.createdAtIso).toLocaleString()}</span>
                    {editingId === r.id ? (
                      <>
                        <button className="pill" onClick={saveEdit}>Speichern</button>
                        <button className="pill" onClick={cancelEdit}>Abbrechen</button>
                      </>
                    ) : (
                      <>
                        <button title="Bearbeiten" onClick={() => startEdit(r)}>✏️</button>
                        <button title="Löschen" onClick={() => deleteReflection(r.id)}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
                {editingId === r.id ? (
                  <div className="mt-2 grid gap-3 text-sm">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Was hat sich verändert?</span>
                        <MicrophoneButton onText={(t) => setEChanged(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
                      </div>
                      <textarea value={eChanged} onChange={e => setEChanged(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Wofür bin ich dankbar?</span>
                        <MicrophoneButton onText={(t) => setEGratitude(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
                      </div>
                      <textarea value={eGratitude} onChange={e => setEGratitude(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Vorsätze</span>
                        <MicrophoneButton onText={(t) => setEVows(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
                      </div>
                      <textarea value={eVows} onChange={e => setEVows(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Sonstige Bemerkungen</span>
                        <MicrophoneButton onText={(t) => setERemarks(prev => prev ? (prev + ' ' + t) : t)} className="pill text-xs" compact />
                      </div>
                      <textarea value={eRemarks} onChange={e => setERemarks(e.target.value)} className="w-full bg-background border border-slate-700 rounded p-2" rows={3} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Körpergewicht (kg) — optional (Format 0,0)</span>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,]*"
                        value={eWeightKg}
                        onChange={e => setEWeightKg(e.target.value)}
                        className="w-full bg-background border border-slate-700 rounded p-2"
                        placeholder="z. B. 72,5"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 grid gap-2 text-sm">
                    {r.changed && <div><div className="text-gray-400 text-xs">Was hat sich verändert?</div><div className="whitespace-pre-wrap">{r.changed}</div></div>}
                    {r.gratitude && <div><div className="text-gray-400 text-xs">Wofür bin ich dankbar?</div><div className="whitespace-pre-wrap">{r.gratitude}</div></div>}
                    {r.vows && <div><div className="text-gray-400 text-xs">Vorsätze</div><div className="whitespace-pre-wrap">{r.vows}</div></div>}
                    {r.remarks && <div><div className="text-gray-400 text-xs">Sonstige Bemerkungen</div><div className="whitespace-pre-wrap">{r.remarks}</div></div>}
                    {typeof r.weightKg === 'number' && (
                      <div>
                        <div className="text-gray-400 text-xs">Körpergewicht</div>
                        <div>{r.weightKg.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.photos.map(p => (
                        <img key={p.id} src={`${p.url}?v=${p.id}`} alt="Foto" className="w-16 h-16 object-cover rounded border border-slate-700" />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
                    <label className="inline-flex items-center gap-2">
                      <span className="pill">Foto hochladen</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) uploadPhotos(r.id, e.target.files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                    <CameraPicker
                      label="Kamera"
                      buttonClassName="pill"
                      onCapture={(files) => uploadPhotos(r.id, files)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
