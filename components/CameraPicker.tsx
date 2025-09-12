"use client"
import React, { useEffect, useRef, useState } from 'react'

export function CameraPicker({
  label = 'Kamera',
  buttonClassName = 'pill',
  onCapture,
}: {
  label?: string
  buttonClassName?: string
  onCapture: (files: File[]) => void
}) {
  const [supported, setSupported] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
        if (!navigator.mediaDevices) { if (mounted) setSupported(false); return }
        // Some browsers only reveal devices reliably after a permission grant once.
        // We avoid prompting here; instead we do a best-effort probe using enumerateDevices.
        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const hasVideo = devices.some(d => d.kind === 'videoinput')
          if (mounted) setSupported(hasVideo)
        } else {
          // Fallback: if getUserMedia exists, consider supported (will prompt on click)
          if (mounted) setSupported(typeof navigator.mediaDevices.getUserMedia === 'function')
        }
      } catch {
        if (mounted) setSupported(false)
      }
    }
    check()
    return () => { mounted = false; stop() }
  }, [])

  async function start() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      // Permission denied or no camera
      stop()
      setOpen(false)
    }
  }

  function stop() {
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    streamRef.current = null
  }

  async function handleOpen() {
    setOpen(true)
    setTimeout(() => start(), 0)
  }

  function handleClose() {
    stop()
    setOpen(false)
  }

  function handleCapture() {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `camera_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: blob.type || 'image/jpeg' })
      onCapture([file])
      handleClose()
    }, 'image/jpeg', 0.9)
  }

  // If no direct camera support is detected, optionally render a capture file input as fallback on mobile browsers.
  if (!supported) {
    if (isMobile) {
      return (
        <label className="inline-flex items-center gap-2 text-xs text-gray-400">
          <span>{label}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) onCapture(Array.from(e.target.files))
              e.currentTarget.value = ''
            }}
          />
        </label>
      )
    }
    return null
  }

  return (
    <>
      <button className={buttonClassName} onClick={handleOpen}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md p-3 flex flex-col gap-3">
            <div className="aspect-video bg-black rounded overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
            </div>
            <div className="flex items-center justify-between">
              <button className="pill" onClick={handleClose}>Schließen</button>
              <button className="pill" onClick={handleCapture}>Foto aufnehmen</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
