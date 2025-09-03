import { NextResponse } from 'next/server'

export async function GET() {
  // Placeholder data
  return NextResponse.json({
    timeline: [],
    markers: [],
  })
}
