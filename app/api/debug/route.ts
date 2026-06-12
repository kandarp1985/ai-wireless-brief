import { NextResponse } from 'next/server'

const USER_AGENT = 'Mozilla/5.0 (compatible; AI-Wireless-Brief/1.0)'

export const runtime = 'nodejs'

export async function GET() {
  const results: Record<string, unknown> = {}

  try {
    const url = 'https://techcrunch.com/feed/'
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    })
    results['tc_status'] = resp.status
    results['tc_ok'] = resp.ok
    const text = await resp.text()
    results['tc_length'] = text.length
    results['tc_start'] = text.slice(0, 300)

    // Try parsing
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    const items = doc.querySelectorAll('item')
    results['tc_items'] = items.length
    if (items.length > 0) {
      const first = items[0]
      results['tc_first_title'] = first.querySelector('title')?.textContent?.trim()
      results['tc_first_pub'] = first.querySelector('pubDate')?.textContent?.trim()
    }
  } catch (e: unknown) {
    results['tc_error'] = String(e)
  }

  try {
    const url2 = 'https://feeds.arstechnica.com/arstechnica/technology-lab'
    const resp2 = await fetch(url2, {
      headers: { 'User-Agent': USER_AGENT },
    })
    results['ars_status'] = resp2.status
    const text2 = await resp2.text()
    results['ars_length'] = text2.length
  } catch (e: unknown) {
    results['ars_error'] = String(e)
  }

  return NextResponse.json(results)
}