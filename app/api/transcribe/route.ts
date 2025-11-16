import { NextRequest, NextResponse } from 'next/server'
import Together from 'together-ai'

const whisperModels = ['openai/whisper-large-v3'] as const
type WhisperModel = (typeof whisperModels)[number]

function isWhisperModel(model: string): model is WhisperModel {
  return whisperModels.includes(model as WhisperModel)
}

// POST /api/transcribe
// FormData: file (audio/*), model (string)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || whisperModels[0]

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    // Determine which service to use based on model
    if (isWhisperModel(model)) {
      // Use TogetherAI for Whisper models
      const apiKey = process.env.TOGETHERAI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Missing TOGETHERAI_API_KEY' }, { status: 500 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const together = new Together({ apiKey })

      const response = await together.audio.transcriptions.create({
        model,
        language: 'de',
        file: new File([buffer], file.name || 'recording.webm', { type: file.type || 'audio/webm' }),
      })

      const text: string = response?.text || ''
      return NextResponse.json({ text })
    } else {
      // Use OpenAI for GPT transcription models
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_TRANSCRIBE
      if (!apiKey) {
        return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
      }

      const ofd = new FormData()
      const bytes = new Uint8Array(await file.arrayBuffer())
      const blob = new Blob([bytes], { type: file.type || 'audio/webm' })
      ofd.append('file', blob, file.name || 'recording.webm')
      ofd.append('model', model)

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: ofd,
      })

      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: 'OpenAI error', details: text }, { status: 500 })
      }

      const data = await res.json()
      const text: string = data?.text || ''
      return NextResponse.json({ text })
    }
  } catch (err) {
    console.error('POST /api/transcribe failed', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
