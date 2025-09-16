"use client"
import React from 'react'

export type Habit = { id: string; title: string; userId?: string | null }

export function HabitChips({
  habits,
  ticks,
  onToggle,
}: {
  habits: Habit[]
  ticks: { habitId: string; checked: boolean }[]
  onToggle: (habitId: string, checked: boolean) => void
}) {
  const checked = new Map(ticks.map(t => [t.habitId, t.checked]))
  const collator = new Intl.Collator('de-DE', { sensitivity: 'base' })
  const std = habits.filter(h => !h.userId).sort((a, b) => collator.compare(a.title, b.title))
  const own = habits.filter(h => !!h.userId).sort((a, b) => collator.compare(a.title, b.title))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {std.map(h => {
          const isOn = checked.get(h.id) ?? false
          return (
            <button
              key={h.id}
              className={`pill ${isOn ? 'active' : ''}`}
              onClick={() => onToggle(h.id, !isOn)}
            >
              {h.title}
            </button>
          )
        })}
      </div>
      {own.length > 0 && (
        <>
          <div className="border-t border-slate-700/60 my-1" />
          <div className="text-sm text-gray-400">Eigene Gewohnheiten</div>
          <div className="flex flex-wrap gap-2">
            {own.map(h => {
              const isOn = checked.get(h.id) ?? false
              return (
                <button
                  key={h.id}
                  className={`pill ${isOn ? 'active' : ''}`}
                  onClick={() => onToggle(h.id, !isOn)}
                >
                  {h.title}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
