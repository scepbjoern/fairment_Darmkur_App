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
  const btnClass = size === 'sm' ? 'px-2 py-1 text-sm' : size === 'lg' ? 'px-4 py-3 text-lg' : 'px-3 py-2'
  return (
    <div className="flex gap-2 overflow-x-auto">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
        <button
          key={n}
          className={`pill ${btnClass} ${value === n ? 'active' : ''}`}
          aria-label={ariaLabel ? `${ariaLabel} ${n}` : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
