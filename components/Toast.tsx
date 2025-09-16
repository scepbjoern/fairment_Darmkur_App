"use client"

import React, { useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastItem = { id: number; kind: ToastKind; text: string }

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  function push(text: string, kind: ToastKind = 'info', duration = 2200) {
    const id = Date.now() + Math.floor(Math.random() * 10000)
    setToasts(t => [...t, { id, kind, text }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number) {
    setToasts(t => t.filter(x => x.id !== id))
  }

  return { toasts, push, dismiss }
}

export function Toasts({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed right-4 bottom-20 z-50 flex flex-col gap-2">
      {toasts.map(t => {
        const color =
          t.kind === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' :
          t.kind === 'error' ? 'bg-red-700/90 border-red-400 text-white' :
          'bg-slate-800/90 border-slate-600 text-gray-100'
        return (
          <div key={t.id} className={`min-w-[200px] max-w-[320px] px-3 py-2 rounded-md border shadow ${color}`}>
            <div className="text-xs flex items-start justify-between gap-2">
              <span>{t.text}</span>
              <button className="text-xs opacity-80 hover:opacity-100" onClick={() => dismiss(t.id)}>×</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
