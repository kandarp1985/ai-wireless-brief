import { fetchAllNews } from '@/lib/rss'
import './globals.css'

function timeAgo(pubDate: string): string {
  try {
    const now = new Date()
    const pub = new Date(pubDate)
    const diffMs = now.getTime() - pub.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return pub.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function NewsCard({ item, accentClass }: { item: any; accentClass: string }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-card">
      <div className="news-card-header">
        <span className="news-source">{item.source}</span>
        <span className="news-time">{timeAgo(item.pubDate)}</span>
      </div>
      <div className="news-title">{item.title}</div>
      <div className="news-card-footer">
        <span className={`cat-tag ${accentClass}`}>{item.category === 'ai-ran' ? 'AI-RAN' : item.category.toUpperCase()}</span>
        <span className="read-link">
          Read → 
        </span>
      </div>
    </a>
  )
}

function Section({ icon, title, items, countClass, tagClass }: {
  icon: string
  title: string
  items: any[]
  countClass: string
  tagClass: string
}) {
  if (items.length === 0) return null
  return (
    <section className="section">
      <div className="section-header">
        <span className="section-icon">{icon}</span>
        <h2 className="section-title">{title}</h2>
        <span className={`section-count ${countClass}`}>{items.length} stories</span>
      </div>
      <div className="news-grid">
        {items.map((item, i) => (
          <NewsCard key={`${item.link}-${i}`} item={item} accentClass={tagClass} />
        ))}
      </div>
    </section>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export default async function Home() {
  let generatedAt = new Date().toISOString()
  let ai: any[] = []
  let wireless: any[] = []
  let aiRan: any[] = []
  let community: any[] = []
  let error: string | null = null

  try {
    const data = await fetchAllNews()
    ai = data.ai
    wireless = data.wireless
    aiRan = data.aiRan
    community = data.community
    generatedAt = new Date().toISOString()
  } catch (e) {
    error = 'Failed to load news. Please refresh the page.'
    console.error(e)
  }

  const generated = new Date(generatedAt)

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="logo">
            <div className="logo-icon">📡</div>
            <div className="logo-text">
              <h1>AI + Wireless Daily Brief</h1>
              <span>qualcomm.engineer</span>
            </div>
          </div>
          <div className="header-meta">
            <div className="refresh-badge">
              <span className="live-dot" />
              LIVE
            </div>
            <span className="last-updated">
              {formatDate(generated.toISOString())} · refreshed every weekday at noon PST
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error ? (
          <div className="error-state">
            <p>{error}</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              Sources: TechCrunch, Ars Technica, AI News, MIT Tech Review, Wired, The Verge, Hacker News
            </p>
          </div>
        ) : (
          <>
            <Section
              icon="🔬"
              title="Top AI Developments"
              items={ai}
              countClass="count-ai"
              tagClass="tag-ai"
            />
            <Section
              icon="📡"
              title="Wireless, 5G & 6G"
              items={wireless}
              countClass="count-wireless"
              tagClass="tag-wireless"
            />
            <Section
              icon="🤖"
              title="AI + Wireless RAN"
              items={aiRan}
              countClass="count-ai-ran"
              tagClass="tag-ai-ran"
            />
            <Section
              icon="💬"
              title="Community Pulse"
              items={community}
              countClass="count-community"
              tagClass="tag-ai"
            />
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>AI + Wireless Daily Brief · {new Date().getFullYear()}</span>
          <span>
            Sources: TechCrunch · Ars Technica · AI News · MIT Tech Review · Wired · The Verge · Hacker News
          </span>
        </div>
      </footer>
    </>
  )
}