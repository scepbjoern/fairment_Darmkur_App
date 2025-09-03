import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Placeholder data
  return NextResponse.json({
    phase: new URL(req.url).searchParams.get('phase'),
    metrics: {},
  })
}
