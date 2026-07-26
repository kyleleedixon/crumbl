# 🍪 Crumbl Tracker

Tracks every Crumbl Cookies weekly menu, computes rarity, and tweets the drop each Monday.

## Stack

- **Next.js 16** (App Router) on Vercel with **Fluid Compute**
- **Neon Postgres** via Vercel Marketplace (`@neondatabase/serverless` + Drizzle ORM)
- **Cheerio** scraping — crumblcookies.com plus historical archives (crumblmenu.us, menucrumblcookies.com)
- **`next/og`** for tweet graphics
- **twitter-api-v2** for posting; falls back to dry-run if credentials are missing
- **Vercel Cron** via `vercel.ts` — Mondays at 12:00 UTC

## Setup

```bash
cp .env.example .env.local
# fill DATABASE_URL from the Neon integration on Vercel (vercel env pull .env.local)
npm run db:push              # apply schema to Postgres
npm run backfill             # scrape historical menus into the DB
npm run scrape -- --ingest   # scrape + ingest this week's menu
npm run dev
```

## Cron

`vercel.ts` schedules `/api/cron/weekly` at `0 12 * * 1` (Monday 12:00 UTC). The handler:

1. Scrapes crumblcookies.com/menu
2. Ingests the week into Postgres (marking debuts + comebacks)
3. Renders `/api/og/week/[startDate]` as a tweet image
4. Posts to Twitter (or logs in dry-run mode)

Test locally:

```bash
curl -H "x-dry-run: 1" http://localhost:3000/api/cron/weekly
```

## Twitter

Set the four `TWITTER_*` env vars from an X developer app (write scope). Leave them blank + `TWITTER_DRY_RUN=1` to render + log tweets without publishing.

## Data sources

- **crumblcookies.com/menu** — official weekly source (parsed from `__NEXT_DATA__` when present, DOM fallback otherwise).
- **crumblmenu.us/all-week-menus** — archive back to 2018; parsed by week heading + `<li>` items.
- **menucrumblcookies.com/crumbl-cookies-archive** — paginated archive; individual week pages are followed.

The ingest layer dedupes flavors by slug across all sources.
