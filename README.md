# AI + Wireless Daily Brief

Daily intelligence on AI, machine learning, 5G/6G, AI-RAN, and wireless technology.

**Live site:** [ai-wireless.vercel.app](https://ai-wireless.vercel.app) (deploy when ready)

## What it does

- Aggregates news from: TechCrunch, Ars Technica, AI News, MIT Technology Review, Wired, The Verge, Hacker News
- Classifies stories into: **AI**, **Wireless/5G/6G**, **AI+RAN**, **Community Pulse**
- 48-hour recency filter
- Refreshes every weekday at noon PST via Vercel Cron
- Dark-themed, mobile-friendly UI

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Vercel** (hosting + cron)
- RSS fetching (server-side, no client-side CORS issues)
- No database, no Supabase — just static generation + cron refresh

## Local development

```bash
cd ai-wireless-brief
npm install
npm run dev
# Open http://localhost:3000
```

## Deploy

```bash
vercel --prod
```

## Cron schedule

Vercel Cron hits `/api/brief` Mon–Fri at 12:00 PM PST (`0 20 * * 1-5` UTC).

## Adding/updating RSS sources

Edit `lib/rss.ts` — `FEEDS` array and keyword classifiers at the top.