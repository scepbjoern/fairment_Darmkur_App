"use client"
import React from 'react'

export function Icon({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return null
  const isEmoji = /[^a-z0-9_\-]/i.test(name) && [...name].length <= 3
  if (isEmoji) return <span className={className}>{name}</span>
  return (
    <span className={`material-symbols-rounded ${className || ''}`.trim()} aria-hidden>
      {name}
    </span>
  )
}
