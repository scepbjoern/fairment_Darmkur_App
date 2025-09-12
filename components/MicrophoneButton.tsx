"use client"
import React, { useEffect, useRef, useState } from 'react'

/**
 * MicrophoneButton
 * - Records audio with MediaRecorder
 * - Sends audio to /api/transcribe with selected model
 * - Calls onText with the transcribed text
 */
export function MicrophoneButton(props: {
  onText: (text: string) => void
  title?: string
  className?: string
  compact?: boolean
  initialModel?: string
  modelOptions?: string[]
}) {
  const {
    onText,
    title = 'Spracheingabe starten/stoppen',
    className,
    compact = true,
    initialModel,
    modelOptions,
  } = props

  const defaultModels = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TRANSCRIBE_MODELS)
    ? String(process.env.NEXT_PUBLIC_TRANSCRIBE_MODELS).split(',').map(s => s.trim()).filter(Boolean)
    : ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1']

  const [selectedModel, setSelectedModel] = useState<string>(
    initialModel || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_OPENAI_TRANSCRIBE_MODEL)
      || (typeof process !== 'undefined' && process.env?.OPENAI_TRANSCRIBE_MODEL)
      || defaultModels[0]
  )
  const [models] = useState<string[]>(modelOptions && modelOptions.length ? modelOptions : defaultModels)

  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCfg, setShowCfg] = useState(false)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    // Restore model from localStorage
    try {
      const saved = localStorage.getItem('transcribe:model')
      if (saved) setSelectedModel(saved)
    } catch {}
  }, [])

  useEffect(() => {
    // Persist model selection
    try { localStorage.setItem('transcribe:model', selectedModel) } catch {}
  }, [selectedModel])

  async function startRec() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = getSupportedMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
          await sendForTranscription(blob)
        } catch (e: any) {
          setError(e?.message || 'Transkription fehlgeschlagen')
        } finally {
          cleanup()
        }
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
    } catch (e: any) {
      setError(e?.message || 'Mikrofon nicht verfügbar')
      cleanup()
    }
  }

  function stopRec() {
    try { recorderRef.current?.stop() } catch {}
    setRecording(false)
  }

  function cleanup() {
    try {
      recorderRef.current?.stream.getTracks().forEach(t => t.stop())
    } catch {}
    recorderRef.current = null
    mediaStreamRef.current = null
    chunksRef.current = []
  }

  function getSupportedMime(): string | null {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ]
    for (const m of candidates) {
      if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported?.(m)) return m
    }
    return null
  }

  async function sendForTranscription(blob: Blob) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('mpeg') ? 'mp3' : 'webm'
      fd.append('file', new File([blob], `recording.${ext}`, { type: blob.type || 'audio/webm' }))
      fd.append('model', selectedModel)

      const res = await fetch('/api/transcribe', { method: 'POST', body: fd, credentials: 'same-origin' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Transkription fehlgeschlagen')
      }
      const data = await res.json()
      if (data?.text) onText(data.text)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <span
        role="button"
        tabIndex={0}
        title={title}
        aria-label={title}
        className={[
          'inline-flex items-center justify-center cursor-pointer select-none',
          recording ? 'text-red-300 hover:text-red-200' : 'text-gray-300 hover:text-gray-100',
          uploading ? 'opacity-60 pointer-events-none' : '',
          className || ''
        ].join(' ')}
        onClick={() => (recording ? stopRec() : startRec())}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (recording ? stopRec() : startRec()) } }}
      >
        {recording ? '⏹️' : '🎙️'}
      </span>
      {!compact && (
        <select
          className="bg-background border border-slate-700 rounded px-2 py-1 text-xs"
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          title="Transkriptionsmodell"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      )}
      {compact && (
        <button type="button" title="Modell wählen" aria-label="Modell wählen" className="text-xs text-gray-400 hover:text-gray-200" onClick={() => setShowCfg(v => !v)}>⚙️</button>
      )}
      {compact && showCfg && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-surface border border-slate-800 rounded p-2 shadow">
          <div className="text-xs mb-1 text-gray-400">Modell</div>
          <select
            className="bg-background border border-slate-700 rounded px-2 py-1 text-xs"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}
      {uploading && <span className="text-xs text-gray-400">…übertrage</span>}
      {error && <span className="text-xs text-red-400" title={error}>Fehler</span>}
    </div>
  )
}
