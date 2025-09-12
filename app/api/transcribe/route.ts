import { NextRequest, NextResponse } from 'next/server'

// POST /api/transcribe
// FormData: file (audio/*), model (string)
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_TRANSCRIBE
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    // Forward to OpenAI transcription endpoint
    const ofd = new FormData()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const blob = new Blob([bytes], { type: file.type || 'audio/webm' })
    ofd.append('file', blob, file.name || 'recording.webm')
    ofd.append('model', model)

    // Optionally you could pass language or prompt if desired
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
    // Expected shape: { text: string, ... }
    const text: string = data?.text || ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('POST /api/transcribe failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
