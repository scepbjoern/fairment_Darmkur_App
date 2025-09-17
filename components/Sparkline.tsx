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
    // Helper to compute color along red (low) → blue (mid) → green (high)
    const mix = (a: [number, number, number], b: [number, number, number], t: number) => {
      const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
      const r = cl(a[0] + (b[0] - a[0]) * t)
      const g = cl(a[1] + (b[1] - a[1]) * t)
      const bch = cl(a[2] + (b[2] - a[2]) * t)
      return `rgb(${r}, ${g}, ${bch})`
    }
    const RED: [number, number, number] = [185, 28, 28]    // red-700 (dunkleres Rot)
    const ORANGE: [number, number, number] = [249, 115, 22] // orange-500
    const GREY: [number, number, number] = [229, 231, 235] // gray-200 (sehr helles Grau, fast weiß)
    const GREEN: [number, number, number] = [34, 197, 94]  // green-500
    const colorFor = (v: number) => {
      const denom = (yMax - yMin) || 1
      const t = (Math.max(yMin, Math.min(yMax, v)) - yMin) / denom
      // Midpoint configurable (default to mid of range)
      const midV = (typeof midValue === 'number') ? midValue : (yMin + yMax) / 2
      const midT = Math.max(0, Math.min(1, (midV - yMin) / denom))
      if (t <= midT) {
        const u = midT > 0 ? (t / midT) : 0
        // Zweistufig: Rot → Orange → Grau
        // Orange-Punkt genau in der Mitte zwischen yMin und midValue (u = 0.5)
        if (u <= 0.5) {
          return mix(RED, ORANGE, u / 0.5)
        } else {
          return mix(ORANGE, GREY, (u - 0.5) / 0.5)
        }
      } else {
        const u = (1 - midT) > 0 ? ((t - midT) / (1 - midT)) : 1
        // Grau → Grün
        return mix(GREY, GREEN, u)
      }
    }
    // Build list of segments
    type Pt = { x: number; y: number; v: number }
    const points: Array<Pt | null> = data.map((v, i) => (v == null || Number.isNaN(v) ? null : { x: xFor(i), y: yFor(v), v }))
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
          const vm = v0 + (v1 - v0) * ((t0 + t1) / 2)
          segments.push({ p1: { x: mx0, y: my0, v: vm }, p2: { x: mx1, y: my1, v: vm }, col: colorFor(vm) })
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
          const vm = v0 + (v1 - v0) * ((t0 + t1) / 2)
          segments.push({ p1: { x: mx0, y: my0, v: vm }, p2: { x: mx1, y: my1, v: vm }, col: colorFor(vm) })
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
