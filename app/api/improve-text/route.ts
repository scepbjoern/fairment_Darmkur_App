import { NextRequest, NextResponse } from 'next/server'
import Together from 'together-ai'

// POST /api/improve-text
// JSON: { text: string, prompt: string, model?: string }
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.TOGETHERAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing TOGETHERAI_API_KEY' }, { status: 500 })
    }

    const body = await req.json()
    const text = body?.text || ''
    const prompt = body?.prompt || 'Verbessere diesen Text'
    const model = body?.model || process.env.TOGETHERAI_LLM_MODEL || 'openai/gpt-oss-20b'

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    const together = new Together({ apiKey })

    // Build the conversation messages
    const messages = [
      {
        role: 'system' as const,
        content: 'Du bist ein hilfreicher Assistent, der Texte verbessert. Antworte nur mit dem verbesserten Text, ohne zusätzliche Erklärungen oder Kommentare.'
      },
      {
        role: 'user' as const,
        content: `${prompt}:\n\n${text}`
      }
    ]

    const response = await together.chat.completions.create({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    })

    const improvedText = response.choices?.[0]?.message?.content || text

    return NextResponse.json({ improvedText })
  } catch (err) {
    console.error('POST /api/improve-text failed', err)
    return NextResponse.json(
      { error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
