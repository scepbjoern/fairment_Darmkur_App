"use client"
import React from 'react'

export function NumberPills({
  min,
  max,
  value,
  onChange,
  size = 'md',
  ariaLabel,
  unsaved = false,
  onClear,
  previousValue,
  includeDashFirst = false,
  dashValue,
}: {
  min: number
  max: number
  value?: number
  onChange: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
  unsaved?: boolean
  onClear?: () => void
  previousValue?: number | null
  includeDashFirst?: boolean
  dashValue?: number
}) {
  // Use fixed square dimensions and rounded-full to achieve perfect circles
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-sm' :
    size === 'lg' ? 'w-12 h-12 text-lg' :
    'w-10 h-10'
  return (
    <div className="flex gap-2 overflow-x-auto my-2 py-1">
      {includeDashFirst && typeof dashValue === 'number' && (
        <button
          key="dash"
          className={`relative rounded-full bg-pill text-gray-200 inline-flex items-center justify-center border border-slate-700 ${sizeClass} ${value === dashValue ? `${unsaved ? 'bg-primary/80' : 'bg-primary'} text-black ${unsaved ? 'border-blue-400' : 'border-transparent'}` : ''} ${previousValue === dashValue && value !== dashValue ? 'ring-2 ring-sky-400/60' : ''}`}
          aria-label={ariaLabel ? `${ariaLabel} —` : '—'}
          onClick={() => {
            if (value === dashValue) {
              onClear?.()
            } else {
              onChange(dashValue)
            }
          }}
        >
          —
          {previousValue === dashValue && value === dashValue ? (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 border border-slate-900" />
          ) : null}
        </button>
      )}
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
        <button
          key={n}
          // Avoid the shared .pill padding (px/py) to prevent ellipses; construct styles directly
          className={`relative rounded-full bg-pill text-gray-200 inline-flex items-center justify-center border border-slate-700 ${sizeClass} ${value === n ? `${unsaved ? 'bg-primary/80' : 'bg-primary'} text-black ${unsaved ? 'border-blue-400' : 'border-transparent'}` : ''} ${previousValue === n && value !== n ? 'ring-2 ring-sky-400/60' : ''}`}
          aria-label={ariaLabel ? `${ariaLabel} ${n}` : undefined}
          onClick={() => {
            if (value === n) {
              onClear?.()
            } else {
              onChange(n)
            }
          }}
        >
          {n}
          {previousValue === n && value === n ? (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 border border-slate-900" />
          ) : null}
        </button>
      ))}
    </div>
  )
}
