'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// ------- Types matching API contracts -------

type SymptomKey =
  | 'BESCHWERDEFREIHEIT'
  | 'ENERGIE'
  | 'STIMMUNG'
  | 'SCHLAF'
  | 'ENTSPANNUNG'
  | 'HEISSHUNGERFREIHEIT'
  | 'BEWEGUNG'

const SYMPTOMS: SymptomKey[] = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
]

type WeeklyData = {
  weekStart: string
  days: string[]
  symptoms: Record<SymptomKey, (number | null)[]>
  wellBeingIndex: (number | null)[]
  stool: (number | null)[]
  habitFulfillment: (number | null)[]
  customSymptoms?: {
    defs: { id: string; title: string }[]
    series: Record<string, (number | null)[]>
  }
}

type PhaseKey = 'PHASE_1' | 'PHASE_2' | 'PHASE_3'

type PhaseData = {
  phase: PhaseKey
  metrics: {
    symptoms: Record<SymptomKey, { avg: number | null; min: number | null; max: number | null }>
    stool: { avg: number | null }
    habitFulfillment: { avg: number | null }
  }
  series: {
    dates: string[]
    wellBeingIndex: (number | null)[]
    stool: (number | null)[]
    habitFulfillment: (number | null)[]
    symptoms: Record<SymptomKey, (number | null)[]>
  }
  customSymptoms?: {
    defs: { id: string; title: string }[]
    series: Record<string, (number | null)[]>
  }
}

type OverallData = {
  dates: string[]
  wellBeingIndex: (number | null)[]
  stool: (number | null)[]
  habitFulfillment: (number | null)[]
  markers: { id: string; date: string; kind: 'WEEK' | 'MONTH' }[]
  symptoms: Record<SymptomKey, (number | null)[]>
  customSymptoms?: {
    defs: { id: string; title: string }[]
    series: Record<string, (number | null)[]>
  }
}

// ------- Utilities -------

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDayLabel(s: string): string {
  const dt = parseYmd(s)
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function shiftDays(ymd: string, delta: number): string {
  const dt = parseYmd(ymd)
  dt.setDate(dt.getDate() + delta)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toSeries(days: string[], values: (number | null)[]) {
  return days.map((date, i) => ({ date, value: values[i] ?? null }))
}

// ------- Small generic chart row -------

function SparkArea({ data, color, yDomain, height = 80 }: { data: { date: string; value: number | null }[]; color: string; yDomain: [number, number]; height?: number }) {
  const gid = `grad-${color.replace('#', '')}`
  return (
    <div className="h-20 sm:h-[88px]">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ left: 6, right: 6, top: 6, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide tickFormatter={formatDayLabel} />
          <YAxis hide domain={yDomain} />
          <Tooltip
            formatter={(v: unknown) => (v == null ? '—' : String(v))}
            labelFormatter={(l: string) => formatDayLabel(l)}
          />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gid})`} connectNulls dot={false} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ------- Weekly View -------

function WeeklyView() {
  const [from, setFrom] = useState<string | null>(null)
  const [data, setData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const days = data?.days ?? []

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    const url = from ? `/api/analytics/weekly?from=${from}` : '/api/analytics/weekly'
    fetch(url, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((j: WeeklyData) => { if (isMounted) setData(j) })
      .catch(err => { if (isMounted) setError(String(err)) })
      .finally(() => { if (isMounted) setLoading(false) })
    return () => { isMounted = false }
  }, [from])

  const canGoNext = useMemo(() => {
    // Vereinfachung: Wenn wir auf der aktuellen Woche sind (from=null), ist Next deaktiviert.
    return from !== null
  }, [from])

  const goPrev = () => {
    const ws = data?.weekStart
    if (ws) setFrom(shiftDays(ws, -7))
  }
  const goNext = () => {
    if (!canGoNext) return
    const ws = data?.weekStart
    if (ws) {
      const _nextFrom = shiftDays(ws, +7)
      // Wenn nextFrom die nächste Woche beschreibt, die Identisch mit "aktuell" wäre, räumen wir auf
      // indem wir wieder auf from=null gehen, damit Server "aktuelle Woche" liefert.
      setFrom(null)
      // Alternativ könnte man noch prüfen, ob nextFrom > heute-wochenstart ist.
    }
  }

  if (loading) return <div className="card p-4">Lade Wochenübersicht…</div>
  if (error) return <div className="card p-4 text-red-400">Fehler: {error}</div>
  if (!data) return <div className="card p-4">Keine Daten</div>

  const wbSeries = toSeries(days, data.wellBeingIndex)
  const stoolSeries = toSeries(days, data.stool)
  const habitSeries = toSeries(days, data.habitFulfillment)

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">Woche ab {data.weekStart}</div>
        <div className="flex items-center gap-2">
          <button className="pill" onClick={goPrev}>Vorherige</button>
          <button className="pill" onClick={() => setFrom(null)}>Heute</button>
          <button className={`pill ${canGoNext ? '' : 'opacity-50 cursor-not-allowed'}`} onClick={goNext} disabled={!canGoNext}>Nächste</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Wohlbefinden-Index</div>
          <SparkArea data={wbSeries} color="#22c55e" yDomain={[1, 10]} />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Stuhl (Bristol 1–7)</div>
          <SparkArea data={stoolSeries} color="#0ea5e9" yDomain={[1, 7]} />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Gewohnheiten‑Erfüllung</div>
          <SparkArea data={habitSeries} color="#a855f7" yDomain={[0, 1]} />
        </div>
        {SYMPTOMS.map((sym) => (
          <div key={sym}>
            <div className="text-xs text-gray-400 mb-1">{sym}</div>
            <SparkArea data={toSeries(days, data?.symptoms?.[sym] ?? [])} color="#f59e0b" yDomain={[1, 10]} />
          </div>
        ))}
        {data.customSymptoms && data.customSymptoms.defs.length > 0 && (
          <div className="col-span-full">
            <div className="text-xs text-gray-400 mb-1">Eigene Symptome</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.customSymptoms.defs.map(def => (
                <div key={def.id}>
                  <div className="text-xs text-gray-400 mb-1">{def.title}</div>
                  <SparkArea
                    data={toSeries(days, data.customSymptoms!.series[def.id] || [])}
                    color="#fb7185"
                    yDomain={[1, 10]}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ------- Phase View -------

function PhaseView() {
  const [phase, setPhase] = useState<PhaseKey>('PHASE_1')
  const [data, setData] = useState<PhaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    setLoading(true)
    setError(null)
    fetch(`/api/analytics/phase?phase=${phase}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((j: PhaseData) => { if (ok) setData(j) })
      .catch(err => { if (ok) setError(String(err)) })
      .finally(() => { if (ok) setLoading(false) })
    return () => { ok = false }
  }, [phase])

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-2">
        {(['PHASE_1','PHASE_2','PHASE_3'] as PhaseKey[]).map(p => (
          <button key={p} className={`pill ${phase===p ? 'active' : ''}`} onClick={() => setPhase(p)}>{p.replace('PHASE_','Phase ')}</button>
        ))}
      </div>

      {loading && <div>Lade Phase…</div>}
      {error && <div className="text-red-400">Fehler: {error}</div>}
      {!loading && !error && data && (
        <>
          {/* KPI Karten */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-surface/60 border border-slate-700">
              <div className="text-xs text-gray-400">Stuhl ∅</div>
              <div className="text-lg">{data.metrics.stool.avg ?? '—'}</div>
            </div>
            <div className="p-3 rounded bg-surface/60 border border-slate-700">
              <div className="text-xs text-gray-400">Gewohnheiten ∅</div>
              <div className="text-lg">{data.metrics.habitFulfillment.avg ?? '—'}</div>
            </div>
            {SYMPTOMS.map(s => (
              <div key={s} className="p-3 rounded bg-surface/60 border border-slate-700">
                <div className="text-xs text-gray-400">{s}</div>
                <div className="text-sm">∅ {data.metrics.symptoms[s].avg ?? '—'} · min {data.metrics.symptoms[s].min ?? '—'} · max {data.metrics.symptoms[s].max ?? '—'}</div>
              </div>
            ))}
          </div>

          {/* Serien */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Wohlbefinden-Index</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={toSeries(data.series.dates, data.series.wellBeingIndex)} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={24} />
                  <YAxis domain={[1,10]} />
                  <Tooltip labelFormatter={formatDayLabel} />
                  <Line type="monotone" dataKey="value" stroke="#22c55e" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Stuhl</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={toSeries(data.series.dates, data.series.stool)} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={24} />
                  <YAxis domain={[1,7]} />
                  <Tooltip labelFormatter={formatDayLabel} />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Gewohnheiten‑Erfüllung</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={toSeries(data.series.dates, data.series.habitFulfillment)} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={24} />
                  <YAxis domain={[0,1]} />
                  <Tooltip labelFormatter={formatDayLabel} />
                  <Line type="monotone" dataKey="value" stroke="#a855f7" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Einzelsymptome als Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYMPTOMS.map((sym) => (
              <div key={sym}>
                <div className="text-xs text-gray-400 mb-1">{sym}</div>
                <SparkArea
                  data={toSeries(data.series.dates, data.series.symptoms[sym] ?? [])}
                  color="#f59e0b"
                  yDomain={[1, 10]}
                />
              </div>
            ))}
            {data.customSymptoms && data.customSymptoms.defs.length > 0 && (
              <div className="col-span-full">
                <div className="text-xs text-gray-400 mb-1">Eigene Symptome</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.customSymptoms.defs.map(def => (
                    <div key={def.id}>
                      <div className="text-xs text-gray-400 mb-1">{def.title}</div>
                      <SparkArea
                        data={toSeries(data.series.dates, data.customSymptoms!.series[def.id] || [])}
                        color="#fb7185"
                        yDomain={[1, 10]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ------- Overall View -------

function OverallView() {
  const [data, setData] = useState<OverallData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    setLoading(true)
    setError(null)
    fetch('/api/analytics/overall', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((j: OverallData) => { if (ok) setData(j) })
      .catch(err => { if (ok) setError(String(err)) })
      .finally(() => { if (ok) setLoading(false) })
    return () => { ok = false }
  }, [])

  return (
    <div className="card p-4 space-y-4">
      {loading && <div>Lade Gesamt-Übersicht…</div>}
      {error && <div className="text-red-400">Fehler: {error}</div>}
      {!loading && !error && data && (
        <>
          <div>
            <div className="text-xs text-gray-400 mb-1">Wohlbefinden-Index</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={toSeries(data.dates, data.wellBeingIndex)} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={28} />
                <YAxis domain={[1,10]} />
                <Tooltip labelFormatter={formatDayLabel} />
                <Line type="monotone" dataKey="value" stroke="#22c55e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Stuhl</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={toSeries(data.dates, data.stool)} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={28} />
                <YAxis domain={[1,7]} />
                <Tooltip labelFormatter={formatDayLabel} />
                <Line type="monotone" dataKey="value" stroke="#0ea5e9" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Habit-Erfüllung</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={toSeries(data.dates, data.habitFulfillment)} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={28} />
                <YAxis domain={[0,1]} />
                <Tooltip labelFormatter={formatDayLabel} />
                <Line type="monotone" dataKey="value" stroke="#a855f7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Marker-Liste als einfache Übersicht */}
          {data.markers.length > 0 && (
            <div className="text-xs text-gray-400">
              Marker: {data.markers.map(m => `${m.kind}@${m.date}`).join(', ')}
            </div>
          )}

          {/* Einzelsymptome gesamt als Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYMPTOMS.map((sym) => (
              <div key={sym}>
                <div className="text-xs text-gray-400 mb-1">{sym}</div>
                <SparkArea data={toSeries(data.dates, data.symptoms[sym] ?? [])} color="#f59e0b" yDomain={[1, 10]} />
              </div>
            ))}
            {data.customSymptoms && data.customSymptoms.defs.length > 0 && (
              <div className="col-span-full">
                <div className="text-xs text-gray-400 mb-1">Eigene Symptome</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.customSymptoms.defs.map(def => (
                    <div key={def.id}>
                      <div className="text-xs text-gray-400 mb-1">{def.title}</div>
                      <SparkArea
                        data={toSeries(data.dates, data.customSymptoms!.series[def.id] || [])}
                        color="#fb7185"
                        yDomain={[1, 10]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ------- Page (tabs) -------

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'weekly' | 'phase' | 'overall'>('weekly')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        <span className="inline-flex items-center gap-1">
          <Icon name="bar_chart" />
          <span>Auswertungen</span>
        </span>
      </h1>
      <div className="card p-4">
        <div className="flex gap-2 mb-4">
          <button className={`pill ${tab==='weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>Woche</button>
          <button className={`pill ${tab==='phase' ? 'active' : ''}`} onClick={() => setTab('phase')}>Phase</button>
          <button className={`pill ${tab==='overall' ? 'active' : ''}`} onClick={() => setTab('overall')}>Gesamt</button>
        </div>
        {tab === 'weekly' && <WeeklyView />}
        {tab === 'phase' && <PhaseView />}
        {tab === 'overall' && <OverallView />}
      </div>
    </div>
  )
}
