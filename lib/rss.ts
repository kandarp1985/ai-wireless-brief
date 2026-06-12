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
    if (isNaN(pub.getTime())) return false
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

// Zero-dependency XML parser for RSS 2.0 and Atom feeds
function extractTag(xml: string, tag: string, index: number): string {
  // Match the i-th occurrence of <tag>...</tag> (handles newlines)
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  let count = 0
  let pos = 0
  while (count < index) {
    const m = xml.slice(pos).match(regex)
    if (!m) return ''
    pos += xml.slice(pos).indexOf(m[0]) + m[0].length
    count++
  }
  const m = xml.slice(0).match(regex)
  if (!m) return ''
  // Try to extract again from the beginning with offset tracking
  let remaining = xml
  let result = ''
  for (let i = 0; i < index + 1; i++) {
    const match = remaining.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
    if (!match) return ''
    if (i === index) {
      result = match[1]
    }
    remaining = remaining.slice(remaining.indexOf(match[0]) + match[0].length)
  }
  return result.trim()
}

function getAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const results: string[] = []
  let match
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim())
  }
  return results
}

function parseItem(rawItem: string, source: string): NewsItem | null {
  // RSS 2.0: <item><title>...</title><link>...</link><pubDate>...</pubDate></item>
  // Try RSS-style first
  const titles = getAllTags(rawItem, 'title')
  const links = getAllTags(rawItem, 'link')
  const pubDates = getAllTags(rawItem, 'pubDate')
  // Atom: <entry><title>...</title><link href="..."/><updated>...</updated></entry>
  const updated = getAllTags(rawItem, 'updated')
  const authors = getAllTags(rawItem, 'author')

  const title = titles[0] || ''
  // For Atom, link might be an attribute: <link href="...">
  let link = links[0] || ''
  if (!link) {
    const linkAttrMatch = rawItem.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)
    if (linkAttrMatch) link = linkAttrMatch[1]
  }

  const pubDate = pubDates[0] || updated[0] || ''

  if (!title || !link) return null
  if (!isRecent(pubDate)) return null
  if (shouldSkip({ title, link })) return null

  const category = classifyCategory(title, link)
  if (!category) return null

  return { title, link, source, category, pubDate }
}

function parseFeedXML(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  try {
    // Extract channel title to verify this is RSS
    const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i)
    if (!channelMatch) return items

    const channelContent = channelMatch[1]

    // Find all <item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    let match
    while ((match = itemRegex.exec(channelContent)) !== null) {
      const item = parseItem(match[1], source)
      if (item) items.push(item)
    }

    // If no RSS items, try Atom <entry> blocks
    if (items.length === 0) {
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
      while ((match = entryRegex.exec(xml)) !== null) {
        const item = parseItem(match[1], source)
        if (item) items.push(item)
      }
    }
  } catch (e) {
    console.error(`Parse error for ${source}:`, e)
  }
  return items
}

async function fetchRSS(name: string, url: string): Promise<NewsItem[]> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    } as RequestInit)
    if (!resp.ok) return []
    const xml = await resp.text()
    return parseFeedXML(xml, name)
  } catch (e) {
    console.error(`Failed to fetch ${name}:`, e?.message)
    return []
  }
}

async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    const resp = await fetch('https://news.ycombinator.com/rss', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    } as RequestInit)
    if (!resp.ok) return []
    const xml = await resp.text()
    return parseFeedXML(xml, 'Hacker News')
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