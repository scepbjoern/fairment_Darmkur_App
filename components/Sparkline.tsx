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
}: {
  data: (number | null)[]
  width?: number
  height?: number
  yMin?: number
  yMax?: number
  color?: string
  className?: string
  connectNulls?: boolean
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
