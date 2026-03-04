# LDU Grant Ops — Dashboard PWA

Mobile-first Progressive Web App for the Life Development University grant management platform.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone browser, then:
**Share → Add to Home Screen** to install as a PWA.

## Environment

Copy `.env.local.example` → `.env.local` (already pre-filled from your backend `.env`).

```
AIRTABLE_API_TOKEN=...
AIRTABLE_BASE_ID=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Screens

| Route | Screen | Who Uses It |
|-------|--------|-------------|
| `/` | Dashboard | Everyone — daily command center |
| `/pipeline` | Kanban Pipeline | Kika Howze — track all 71+ grants |
| `/writing-queue` | Writing Queue | Kika Howze — active drafts |
| `/funders` | Funder Database | Research — intelligence profiles |
| `/awards` | Awards & Submitted | Kika Keith — final decisions |

## Deploy to Vercel (free)

```bash
# Install Vercel CLI
npm i -g vercel

# From the frontend/ directory
vercel --prod
```

Set env vars in Vercel dashboard → Settings → Environment Variables.

After deploy, update `NEXT_PUBLIC_BASE_URL` to your Vercel URL.

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — dark theme, mobile-first
- **PWA** via `@ducanh2912/next-pwa`
- **Recharts** — pipeline charts
- **Airtable REST API** — live data via server-side proxy routes
