'use server'

const ATOM_NS = 'http://www.w3.org/2005/Atom'
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36'

export interface NewsItem {
  title: string
  link: string
  source: string
  category: string
  pubDate: string
  snippet: string
}

// Categories for classification
const AI_KEYWORDS = ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'claude', 'gemini', 'deepmind', 'openai', 'neural network', 'large language model', 'generative ai', 'chatbot', 'nlp', 'foundation model', 'multimodal', 'diffusion', 'transformer model', 'AI', 'ML']
const WIRELESS_KEYWORDS = ['5g', '6g', 'wireless', 'ran', 'o-ran', 'orAN', 'lte', 'nr ', 'beamforming', 'mmwave', 'sub-6', 'Qualcomm', 'network ', 'spectrum', 'antenna', 'radio access', 'carrier', 'mobile network', 'telecom', 'Nokia', 'Ericsson', 'Samsung network']
const AI_RAN_KEYWORDS = ['ai-ran', 'ai ran', 'AI-RAN', 'neural phy', 'ai-driven radio', 'intelligent reflecting', 'ai beamforming', 'ai for wireless', 'machine learning radio', 'ai radio', 'AI-driven scheduling', 'ai wireless', 'ai phy', 'AI-powered radio']
const SKIP_SOURCES = ['pypi.org', 'prnewswire', 'marketbeat', 'zacks', 'investorplace', 'seekingalpha', 'comicbook.com']
const SKIP_TITLES = ['version', 'recipe', 'crisp', 'strawberry', 'rhubarb', 'crust', 'ingredient', 'bake', 'cook ']
const SKIP_CONTENT = ['quarterly results', 'earning', 'revenue', 'stock price', 'ticker', 'dividend']

function isRecent(pubDate: string): boolean {
  try {
    const now = new Date()
    const pub = new Date(pubDate)
    const diffHours = (now.getTime() - pub.getTime()) / (1000 * 60 * 60)
    return diffHours <= 48
  } catch {
    return false
  }
}

function classifyCategory(title: string, link: string): string | null {
  const combined = (title + ' ' + link).toLowerCase()
  for (const kw of AI_RAN_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return 'ai-ran'
  }
  for (const kw of WIRELESS_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return 'wireless'
  }
  for (const kw of AI_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return 'ai'
  }
  return null
}

function shouldSkip(item: { title: string; link: string; content?: string }): boolean {
  const t = item.title.toLowerCase()
  const l = item.link.toLowerCase()
  const c = (item.content || '').toLowerCase()
  if (SKIP_SOURCES.some(s => l.includes(s))) return true
  if (SKIP_TITLES.some(s => t.includes(s))) return true
  if (SKIP_CONTENT.some(s => c.includes(s))) return true
  return false
}

async function fetchRSS(name: string, url: string): Promise<NewsItem[]> {
  const items: NewsItem[] = []
  try {
    const req = new Request(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000)
    })
    const resp = await fetch(req, { cache: 'no-store' } as RequestInit)
    if (!resp.ok) return []
    const xml = await resp.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const entries = doc.querySelectorAll('item, entry')
    entries.forEach(item => {
      const titleEl = item.querySelector('title')
      const linkEl = item.querySelector('link')
      const pubEl = item.querySelector('pubDate, published, updated')
      let link = linkEl?.textContent?.trim() || ''
      if (!link && linkEl) {
        const altLink = item.querySelector('link[rel="alternate"]')
        link = altLink?.getAttribute('href') || link
      }
      const title = titleEl?.textContent?.trim() || ''
      const pubDate = pubEl?.textContent?.trim() || ''
      if (!title || !link) return
      if (!isRecent(pubDate)) return
      if (shouldSkip({ title, link })) return
      const category = classifyCategory(title, link)
      if (!category) return
      items.push({ title, link, source: name, category, pubDate, snippet: '' })
    })
  } catch (e) {
    console.error(`Failed to fetch ${name}: ${e}`)
  }
  return items
}

async function fetchHackerNews(): Promise<NewsItem[]> {
  const items: NewsItem[] = []
  try {
    const resp = await fetch('https://news.ycombinator.com/rss', {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
    } as RequestInit)
    if (!resp.ok) return []
    const xml = await resp.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    doc.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent?.trim() || ''
      const link = item.querySelector('link')?.textContent?.trim() || ''
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || ''
      if (!title || !link) return
      if (!isRecent(pubDate)) return
      if (shouldSkip({ title, link })) return
      const category = classifyCategory(title, link)
      if (!category) return
      items.push({ title, link, source: 'Hacker News', category, pubDate, snippet: '' })
    })
  } catch (e) {
    console.error(`Failed to fetch HN: ${e}`)
  }
  return items
}

export async function fetchAllNews(): Promise<{ ai: NewsItem[], wireless: NewsItem[], aiRan: NewsItem[], community: NewsItem[] }> {
  const rssItems = await Promise.all([
    fetchRSS('TechCrunch', 'https://techcrunch.com/feed/'),
    fetchRSS('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/technology-lab'),
    fetchRSS('AI News', 'https://artificialintelligence-news.com/feed/'),
    fetchRSS('MIT Tech Review', 'https://www.technologyreview.com/feed/'),
    fetchRSS('Wired', 'https://www.wired.com/feed/rss'),
    fetchRSS('The Verge', 'https://www.theverge.com/rss/index.xml'),
    fetchHackerNews(),
  ])

  const allItems = rssItems.flat()
  const ai = allItems.filter(i => i.category === 'ai').slice(0, 8)
  const wireless = allItems.filter(i => i.category === 'wireless').slice(0, 6)
  const aiRan = allItems.filter(i => i.category === 'ai-ran').slice(0, 4)
  const community = allItems.filter(i => ['ai', 'wireless', 'ai-ran'].includes(i.category)).slice(0, 6)

  return { ai, wireless, aiRan, community }
}