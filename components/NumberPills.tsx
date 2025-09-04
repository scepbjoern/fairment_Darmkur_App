"use client"
import React from 'react'

export function NumberPills({
  min,
  max,
  value,
  onChange,
  size = 'md',
  ariaLabel,
}: {
  min: number
  max: number
  value?: number
  onChange: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
}) {
  // Use fixed square dimensions and rounded-full to achieve perfect circles
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-sm' :
    size === 'lg' ? 'w-12 h-12 text-lg' :
    'w-10 h-10'
  return (
    <div className="flex gap-2 overflow-x-auto">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
        <button
          key={n}
          // Avoid the shared .pill padding (px/py) to prevent ellipses; construct styles directly
          className={`rounded-full bg-pill text-gray-200 inline-flex items-center justify-center border border-slate-700 ${sizeClass} ${value === n ? 'bg-primary text-black border-transparent' : ''}`}
          aria-label={ariaLabel ? `${ariaLabel} ${n}` : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
