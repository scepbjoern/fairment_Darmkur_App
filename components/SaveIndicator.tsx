"use client"
import React, { useEffect, useState } from 'react'

export function useSaveIndicator() {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function startSaving() {
    setSaving(true)
  }
  function doneSaving() {
    setSaving(false)
    setSavedAt(Date.now())
  }

  return { saving, savedAt, startSaving, doneSaving }
}

export function SaveIndicator({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (savedAt) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(t)
    }
  }, [savedAt])

  return (
    <div className="text-xs text-gray-400 h-4">
      {saving ? 'Speichern…' : visible ? 'Gespeichert ✓' : ''}
    </div>
  )
}
