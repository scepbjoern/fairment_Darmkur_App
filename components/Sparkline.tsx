"use client"
import React from 'react'

export function Sparkline({
  data,
  width = 72,
  height = 24,
  yMin = 1,
  yMax = 10,
  color = '#60a5fa',
  className,
  connectNulls = true,
  colorByValue = false,
  midValue,
  subdivide = 10,
  scheme = 'symptom',
}: {
  data: (number | null)[]
  width?: number
  height?: number
  yMin?: number
  yMax?: number
  color?: string
  className?: string
  connectNulls?: boolean
  colorByValue?: boolean
  midValue?: number
  subdivide?: number
  scheme?: 'symptom' | 'stool'
}) {
  const w = Math.max(10, Math.floor(width))
  const h = Math.max(10, Math.floor(height))
  const m = 2 // inner margin to avoid clipping of 2px stroke
  const n = data.length
  if (!n) return null

  // Scale helpers
  const xFor = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * (w - 2 * m) + m)
  const yFor = (v: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, v))
    const t = (clamped - yMin) / (yMax - yMin || 1)
    // y=0 at top, so invert
    return (1 - t) * (h - 2 * m) + m
  }

  // Build path string (connect segments or break on nulls)
  // If colorByValue, render per-segment <path> to allow individual colors
  if (colorByValue) {
    // Helper to mix two RGB colors
    const mix = (a: [number, number, number], b: [number, number, number], t: number) => {
      const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
      const r = cl(a[0] + (b[0] - a[0]) * t)
      const g = cl(a[1] + (b[1] - a[1]) * t)
      const bch = cl(a[2] + (b[2] - a[2]) * t)
      return `rgb(${r}, ${g}, ${bch})`
    }
    const mixRGB = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => {
      const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
      return [
        cl(a[0] + (b[0] - a[0]) * t),
        cl(a[1] + (b[1] - a[1]) * t),
        cl(a[2] + (b[2] - a[2]) * t),
      ]
    }
    const RED: [number, number, number] = [239, 68, 68]     // red-500
    const ORANGE: [number, number, number] = [249, 115, 22] // orange-500
    const GREY: [number, number, number] = [229, 231, 235]  // gray-200 (sehr helles Grau)
    const GREEN: [number, number, number] = [34, 197, 94]   // green-500
    const LIGHT_GREEN: [number, number, number] = [134, 239, 172] // green-300

    const VIOLET: [number, number, number] = [139, 92, 246] // violet-500
    const colorFor = (v: number) => {
      const denom = (yMax - yMin) || 1
      const clamped = Math.max(yMin, Math.min(yMax, v))
      const t = (clamped - yMin) / denom
      // Midpoint configurable (default to mid of range)
      const midV = (typeof midValue === 'number') ? midValue : (yMin + yMax) / 2
      const midT = Math.max(0, Math.min(1, (midV - yMin) / denom))

      if (scheme === 'stool') {
        if (v === 99) return `rgb(${VIOLET[0]}, ${VIOLET[1]}, ${VIOLET[2]})`
        // Symmetrische Skala um midV: 4 = grün, 3/5 hellgrün, 2/6 orange, 1/7 rot (mit weichen Übergängen)
        const halfRange = Math.max(midV - yMin, yMax - midV) || 1
        const s = Math.min(1, Math.abs(clamped - midV) / halfRange) // 0..1 Abstand zur Mitte
        const b1 = 1 / 3 // bis ~3/5: hellgrün
        const b2 = 2 / 3 // bis ~2/6: orange
        if (s <= b1) {
          const u = s / b1
          return mix(GREEN, LIGHT_GREEN, u)
        } else if (s <= b2) {
          const u = (s - b1) / (b2 - b1)
          return mix(LIGHT_GREEN, ORANGE, u)
        } else {
          const u = (s - b2) / (1 - b2)
          return mix(ORANGE, RED, u)
        }
      }

      // Standard (Symptome): Rot → Orange → sehr helles Grau → Grün
      if (t <= midT) {
        const u = midT > 0 ? (t / midT) : 0
        if (u <= 0.5) {
          return mix(RED, ORANGE, u / 0.5)
        } else {
          return mix(ORANGE, GREY, (u - 0.5) / 0.5)
        }
      } else {
        const u = (1 - midT) > 0 ? ((t - midT) / (1 - midT)) : 1
        return mix(GREY, GREEN, u)
      }
    }
    const colorForRGB = (v: number): [number, number, number] => {
      const denom = (yMax - yMin) || 1
      const clamped = Math.max(yMin, Math.min(yMax, v))
      const t = (clamped - yMin) / denom
      const midV = (typeof midValue === 'number') ? midValue : (yMin + yMax) / 2
      const midT = Math.max(0, Math.min(1, (midV - yMin) / denom))
      if (scheme === 'stool') {
        if (v === 99) return VIOLET
        const halfRange = Math.max(midV - yMin, yMax - midV) || 1
        const s = Math.min(1, Math.abs(clamped - midV) / halfRange)
        const b1 = 1 / 3
        const b2 = 2 / 3
        if (s <= b1) {
          const u = s / b1
          return mixRGB(GREEN, LIGHT_GREEN, u)
        } else if (s <= b2) {
          const u = (s - b1) / (b2 - b1)
          return mixRGB(LIGHT_GREEN, ORANGE, u)
        } else {
          const u = (s - b2) / (1 - b2)
          return mixRGB(ORANGE, RED, u)
        }
      }
      if (t <= midT) {
        const u = midT > 0 ? (t / midT) : 0
        if (u <= 0.5) {
          return mixRGB(RED, ORANGE, u / 0.5)
        } else {
          return mixRGB(ORANGE, GREY, (u - 0.5) / 0.5)
        }
      } else {
        const u = (1 - midT) > 0 ? ((t - midT) / (1 - midT)) : 1
        return mixRGB(GREY, GREEN, u)
      }
    }
    // Build list of segments
    type Pt = { x: number; y: number; v: number }
    const points: Array<Pt | null> = data.map((v, i) => {
      if (v == null || Number.isNaN(v)) return null
      const x = xFor(i)
      // For stool scheme: render 99 (kein Stuhl) at bottom line (yMin)
      const y = scheme === 'stool' && v === 99 ? yFor(yMin) : yFor(v)
      return { x, y, v }
    })
    const segments: { p1: Pt; p2: Pt; col: string }[] = []
    if (connectNulls) {
      const idxs = points.map((p, i) => (p ? i : -1)).filter(i => i >= 0)
      for (let k = 1; k < idxs.length; k++) {
        const i0 = idxs[k - 1]
        const i1 = idxs[k]
        const p1 = points[i0] as Pt
        const p2 = points[i1] as Pt
        // Subdivide into micro-segments for smooth gradient
        const v0 = data[i0] as number
        const v1 = data[i1] as number
        const steps = Math.max(1, Math.floor(subdivide))
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps
          const t1 = (s + 1) / steps
          const mx0 = p1.x + (p2.x - p1.x) * t0
          const my0 = p1.y + (p2.y - p1.y) * t0
          const mx1 = p1.x + (p2.x - p1.x) * t1
          const my1 = p1.y + (p2.y - p1.y) * t1
          // If one endpoint is 99 (violett), blend color along the segment between endpoint colors
          if (scheme === 'stool' && (v0 === 99 || v1 === 99)) {
            const m = (t0 + t1) / 2
            const c0 = colorForRGB(v0)
            const c1 = colorForRGB(v1)
            const c = mixRGB(c0, c1, m)
            segments.push({ p1: { x: mx0, y: my0, v: v0 }, p2: { x: mx1, y: my1, v: v1 }, col: `rgb(${c[0]}, ${c[1]}, ${c[2]})` })
          } else {
            const vm = v0 + (v1 - v0) * ((t0 + t1) / 2)
            segments.push({ p1: { x: mx0, y: my0, v: vm }, p2: { x: mx1, y: my1, v: vm }, col: colorFor(vm) })
          }
        }
      }
    } else {
      for (let i = 1; i < n; i++) {
        const p1 = points[i - 1]
        const p2 = points[i]
        if (!p1 || !p2) continue
        const v0 = data[i - 1] as number
        const v1 = data[i] as number
        const steps = Math.max(1, Math.floor(subdivide))
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps
          const t1 = (s + 1) / steps
          const mx0 = p1.x + (p2.x - p1.x) * t0
          const my0 = p1.y + (p2.y - p1.y) * t0
          const mx1 = p1.x + (p2.x - p1.x) * t1
          const my1 = p1.y + (p2.y - p1.y) * t1
          if (scheme === 'stool' && (v0 === 99 || v1 === 99)) {
            const m = (t0 + t1) / 2
            const c0 = colorForRGB(v0)
            const c1 = colorForRGB(v1)
            const c = mixRGB(c0, c1, m)
            segments.push({ p1: { x: mx0, y: my0, v: v0 }, p2: { x: mx1, y: my1, v: v1 }, col: `rgb(${c[0]}, ${c[1]}, ${c[2]})` })
          } else {
            const vm = v0 + (v1 - v0) * ((t0 + t1) / 2)
            segments.push({ p1: { x: mx0, y: my0, v: vm }, p2: { x: mx1, y: my1, v: vm }, col: colorFor(vm) })
          }
        }
      }
    }

    if (segments.length === 0) return null

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className={className}
        role="img"
        aria-hidden
      >
        {segments.map((s, idx) => (
          <path
            key={idx}
            d={`M ${s.p1.x.toFixed(2)} ${s.p1.y.toFixed(2)} L ${s.p2.x.toFixed(2)} ${s.p2.y.toFixed(2)}`}
            fill="none"
            stroke={s.col}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    )
  }

  // Default single-color path
  let d = ''
  let penDown = false
  for (let i = 0; i < n; i++) {
    const v = data[i]
    if (v == null || Number.isNaN(v)) {
      if (connectNulls) continue
      penDown = false
      continue
    }
    const x = xFor(i)
    const y = yFor(v)
    if (!penDown) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)}`
      penDown = true
    } else {
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
    }
  }
  if (!d) return null

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-hidden
    >
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
