import { NextResponse } from 'next/server'
import { fetchAllNews } from '@/lib/rss'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const data = await fetchAllNews()
    return NextResponse.json({
      ...data,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}