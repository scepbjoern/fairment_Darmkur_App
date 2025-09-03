import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Placeholder data
  return NextResponse.json({
    from: new URL(req.url).searchParams.get('from'),
    symptoms: [],
    stool: [],
    habitFulfillment: [],
  })
}
