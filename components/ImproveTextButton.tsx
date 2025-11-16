"use client"
import React, { useState } from 'react'
import { TextImprovementDialog } from './TextImprovementDialog'

/**
 * ImproveTextButton
 * - Shows a magic wand icon
 * - Opens a dialog to improve text using AI
 * - Calls onImprovedText when user accepts the improved text
 */
export function ImproveTextButton(props: {
  text: string
  onImprovedText: (improvedText: string) => void
  title?: string
  className?: string
}) {
  const { text, onImprovedText, title = 'Text mit KI verbessern', className } = props
  const [showDialog, setShowDialog] = useState(false)

  function handleAccept(improvedText: string) {
    onImprovedText(improvedText)
    setShowDialog(false)
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title={title}
        aria-label={title}
        className={[
          'inline-flex items-center justify-center cursor-pointer select-none',
          'text-gray-300 hover:text-gray-100',
          className || ''
        ].join(' ')}
        onClick={() => setShowDialog(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShowDialog(true)
          }
        }}
      >
        🪄
      </span>

      {showDialog && (
        <TextImprovementDialog
          originalText={text}
          onAccept={handleAccept}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  )
}
