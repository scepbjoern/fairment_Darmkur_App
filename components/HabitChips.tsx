"use client"
import React from 'react'
import { Icon } from '@/components/Icon'

export type Habit = { id: string; title: string; userId?: string | null; icon?: string | null }

export function HabitChips({
  habits,
  ticks,
  onToggle,
  yesterdaySelectedIds,
}: {
  habits: Habit[]
  ticks: { habitId: string; checked: boolean }[]
  onToggle: (habitId: string, checked: boolean) => void
  yesterdaySelectedIds?: string[]
}) {
  const checked = new Map(ticks.map(t => [t.habitId, t.checked]))
  const yesterdaySet = new Set(yesterdaySelectedIds || [])
  const collator = new Intl.Collator('de-DE', { sensitivity: 'base' })
  const std = habits.filter(h => !h.userId).sort((a, b) => collator.compare(a.title, b.title))
  const own = habits.filter(h => !!h.userId).sort((a, b) => collator.compare(a.title, b.title))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 my-1 py-0.5">
        {std.map(h => {
          const isOn = checked.get(h.id) ?? false
          const wasOn = yesterdaySet.has(h.id)
          return (
            <button
              key={h.id}
              className={`relative pill ${isOn ? 'active' : ''} ${wasOn && !isOn ? 'ring-2 ring-sky-400/60' : ''}`}
              onClick={() => onToggle(h.id, !isOn)}
            >
              <span className="inline-flex items-center gap-1">
                {h.icon ? <Icon name={h.icon} /> : null}
                <span>{h.title}</span>
              </span>
              {/* corner dot removed per spec: no dot when yesterday==today */}
            </button>
          )
        })}
      </div>
      {own.length > 0 && (
        <>
          <div className="border-t border-slate-700/60 my-1" />
          <div className="text-sm text-gray-400">Eigene Gewohnheiten</div>
          <div className="flex flex-wrap gap-2 my-1 py-0.5">
            {own.map(h => {
              const isOn = checked.get(h.id) ?? false
              const wasOn = yesterdaySet.has(h.id)
              return (
                <button
                  key={h.id}
                  className={`relative pill ${isOn ? 'active' : ''} ${wasOn && !isOn ? 'ring-2 ring-sky-400/60' : ''}`}
                  onClick={() => onToggle(h.id, !isOn)}
                >
                  <span className="inline-flex items-center gap-1">
                    {h.icon ? <Icon name={h.icon} /> : null}
                    <span>{h.title}</span>
                  </span>
                  {/* corner dot removed per spec: no dot when yesterday==today */}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
