'use server'

const USER_AGENT = 'Mozilla/5.0 (compatible; AI-Wireless-Brief/1.0)'

export interface NewsItem {
  title: string
  link: string
  source: string
  category: string
  pubDate: string
}

const AI_KEYWORDS = ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'claude', 'gemini', 'deepmind', 'openai', 'neural network', 'large language model', 'generative ai', 'chatbot', 'nlp', 'foundation model', 'multimodal', 'diffusion', 'transformer model']
const WIRELESS_KEYWORDS = ['5g', '6g', 'wireless', 'ran', 'o-ran', 'lte', 'nr ', 'beamforming', 'mmwave', 'sub-6', 'qualcomm', 'network ', 'spectrum', 'antenna', 'radio access', 'carrier', 'mobile network', 'telecom']
const AI_RAN_KEYWORDS = ['ai-ran', 'ai ran', 'neural phy', 'ai-driven radio', 'intelligent reflecting', 'ai beamforming', 'ai for wireless', 'machine learning radio', 'ai radio']
const SKIP_SOURCES = ['pypi.org', 'prnewswire', 'marketbeat', 'zacks', 'investorplace', 'seekingalpha', 'comicbook.com']
const SKIP_TITLES = ['version', 'recipe', 'crisp', 'strawberry', 'rhubarb']

function isRecent(pubDate: string): boolean {
  if (!pubDate) return false
  try {
    const now = new Date()
    const pub = new Date(pubDate)
    // Guard against future dates (timezone mismatches in RSS feeds)
    if (pub > now) return true
    const diffHours = (now.getTime() - pub.getTime()) / (1000 * 60 * 60)
    return diffHours >= 0 && diffHours <= 72
  } catch {
    return false
  }
}

function classifyCategory(title: string, link: string): string | null {
  const combined = (title + ' ' + link).toLowerCase()
  for (const kw of AI_RAN_KEYWORDS) {
    if (combined.includes(kw)) return 'ai-ran'
  }
  for (const kw of WIRELESS_KEYWORDS) {
    if (combined.includes(kw)) return 'wireless'
  }
  for (const kw of AI_KEYWORDS) {
    if (combined.includes(kw)) return 'ai'
  }
  return null
}

function shouldSkip(item: { title: string; link: string }): boolean {
  const t = item.title.toLowerCase()
  const l = item.link.toLowerCase()
  return SKIP_SOURCES.some(s => l.includes(s)) || SKIP_TITLES.some(s => t.includes(s))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ])
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const resp = await withTimeout(
    fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    } as RequestInit),
    timeoutMs
  )
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.text()
}

function parseRSS(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const entries = doc.querySelectorAll('item, entry')
    entries.forEach(item => {
      const titleEl = item.querySelector('title')
      const linkEl = item.querySelector('link')
      const pubEl = item.querySelector('pubDate, published, updated')
      let link = linkEl?.textContent?.trim() || ''
      if (!link) {
        const altLink = item.querySelector('link[rel="alternate"]')
        link = altLink?.getAttribute('href') || ''
      }
      const title = titleEl?.textContent?.trim() || ''
      const pubDate = pubEl?.textContent?.trim() || ''
      if (!title || !link) return
      if (!isRecent(pubDate)) return
      if (shouldSkip({ title, link })) return
      const category = classifyCategory(title, link)
      if (!category) return
      items.push({ title, link, source, category, pubDate })
    })
  } catch (e) {
    console.error(`Parse error for ${source}:`, e)
  }
  return items
}

async function fetchRSS(name: string, url: string): Promise<NewsItem[]> {
  try {
    const xml = await fetchText(url, 15000)
    return parseRSS(xml, name)
  } catch (e) {
    console.error(`Failed to fetch ${name}:`, e?.message)
    return []
  }
}

async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    const xml = await fetchText('https://news.ycombinator.com/rss', 15000)
    return parseRSS(xml, 'Hacker News')
  } catch (e) {
    console.error('Failed to fetch HN:', e?.message)
    return []
  }
}

export async function fetchAllNews(): Promise<{
  ai: NewsItem[]
  wireless: NewsItem[]
  aiRan: NewsItem[]
  community: NewsItem[]
}> {
  const results = await Promise.allSettled([
    fetchRSS('TechCrunch', 'https://techcrunch.com/feed/'),
    fetchRSS('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/technology-lab'),
    fetchRSS('AI News', 'https://artificialintelligence-news.com/feed/'),
    fetchRSS('MIT Tech Review', 'https://www.technologyreview.com/feed/'),
    fetchRSS('Wired', 'https://www.wired.com/feed/rss'),
    fetchRSS('The Verge', 'https://www.theverge.com/rss/index.xml'),
    fetchHackerNews(),
  ])

  const allItems = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<NewsItem[]>).value)

  const ai = allItems.filter(i => i.category === 'ai').slice(0, 8)
  const wireless = allItems.filter(i => i.category === 'wireless').slice(0, 6)
  const aiRan = allItems.filter(i => i.category === 'ai-ran').slice(0, 4)
  const community = allItems.filter(i => ['ai', 'wireless', 'ai-ran'].includes(i.category)).slice(0, 6)

  return { ai, wireless, aiRan, community }
}