"use client"
import React from 'react'

export type Habit = { id: string; title: string }

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
  return (
    <div className="flex flex-wrap gap-2">
      {habits.map(h => {
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
  )
}
