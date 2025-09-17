"use client"

import React from 'react'

export type SaveBarProps = {
  visible: boolean
  saving?: boolean
  dirtyCount?: number
  onSave: () => void | Promise<void>
  onDiscard: () => void
}

export function SaveBar({ visible, saving = false, dirtyCount: _dirtyCount = 0, onSave, onDiscard }: SaveBarProps) {
  if (!visible) return null
  const label = saving ? 'Speichern…' : (_dirtyCount > 0 ? 'Ungespeicherte Änderungen' : 'Gespeichert ✓')
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
      role="region"
      aria-live="polite"
    >
      <div className="px-3 py-2 rounded-full border border-red-400 dark:border-red-400 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md shadow-lg flex items-center gap-3">
        <div className="text-xs text-gray-800 dark:text-gray-100 font-medium">
          {label}
        </div>
        {_dirtyCount > 0 && !saving && (
          <div className="flex items-center gap-2">
            <button
              className="pill text-xs !bg-green-600 !text-white hover:bg-pill-light dark:hover:bg-pill hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-60"
              onClick={onSave}
            >
              Speichern
            </button>
            <button className="pill text-xs" onClick={onDiscard}>
              Verwerfen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
