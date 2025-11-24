---
description: Get comprehensive context about the TikTok Hook Analyzer project
---

# Project Context: TikTok Hook Analyzer

## Overview
TikTok Hook Analyzer is a Next.js SaaS application that uses AI to analyze viral TikTok hooks, spot trends, and provide data-driven insights for content creators.

**Current Status:** Functional MVP being prepared for sale
**Stack:** Next.js 15, tRPC, Supabase, Gemini 1.5 Pro, Inngest, Tailwind CSS

## Key Features
- **AI-Powered Analysis:** Gemini 1.5 Pro analyzes TikTok videos to extract hooks, techniques, and emotional triggers
- **Smart Clustering:** ML-powered clustering groups similar hooks automatically to find winning patterns
- **Trend Analysis:** Real-time tracking of top-performing content across niches
- **Search & Scrape:** Uses RapidAPI to find and analyze top TikTok videos by keyword
- **Background Jobs:** Inngest handles video processing, analysis, and trimming

## Architecture

### Directory Structure
```
nextjs/
├── src/
│   ├── pages/                 # Next.js pages (App Router)
│   │   ├── index.tsx          # Landing page
│   │   ├── dashboard/         # Dashboard pages
│   │   │   └── tiktok/        # TikTok analyzer dashboards
│   ├── components/            # React components
│   │   ├── tiktok/            # TikTok-specific components
│   │   └── ui/                # Shadcn UI components
│   ├── server/
│   │   ├── api/routers/       # tRPC API routes
│   │   └── services/          # Business logic (clustering, etc.)
│   ├── inngest/               # Background job definitions
│   └── utils/                 # Helper functions
supabase/                      # Database migrations
```

### Tech Stack
- **Frontend:** Next.js 15, React 18, TypeScript
- **API:** tRPC for type-safe APIs
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** Google Gemini 1.5 Pro API
- **Jobs:** Inngest for background processing
- **Styling:** Tailwind CSS + Radix UI (shadcn/ui)
- **Icons:** lucide-react
- **Video:** TikTok scraping via RapidAPI

## Key Database Tables
- `tiktok_search_terms` - Search queries for trending content
- `tiktok_videos` - Scraped video metadata
- `tiktok_hook_analysis` - AI analysis results (hooks, techniques, scores)
- `users` - User authentication (Supabase Auth)

## Environment Variables
Located in `nextjs/.env.local`:
- `RAPID_API_KEY` - TikTok data access
- `GEMINI_API_KEY` - AI analysis
- `SUPABASE_*` - Database and auth (local or remote)
- `INNGEST_*` - Background job processing
- `NEXT_PUBLIC_SUPABASE_*` - Client-side Supabase config

## Current Setup
- **Local Supabase:** Running at http://127.0.0.1:54321
- **Studio:** http://127.0.0.1:54323
- **Next.js Dev:** http://localhost:3000
- **Supabase CLI:** Installed at ~/bin/supabase

## Development Workflow

### Running the App
```bash
# Start Next.js dev server
cd nextjs && npm run dev

# Start Supabase (if using local)
~/bin/supabase start

# Start Inngest dev server (for background jobs)
npx inngest-cli@latest dev
```

### Key Files Modified Recently
- `nextjs/src/pages/dashboard/tiktok/index.tsx` - Dashboard with formatted hook types
- `nextjs/src/pages/index.tsx` - Landing page with dashboard preview
- `nextjs/src/components/tiktok/HookClusters.tsx` - Clustering analysis component
- `nextjs/.env.local` - Now pointing to local Supabase

## Known Issues & Constraints
1. **Clustering requires minimum 5 analyses** per search term
2. **Inngest must be running** for video processing jobs to work
3. **Empty state for new users** - needs better onboarding/demo data
4. **Dashboard preview image** was missing (now replaced with component)

## Design System
- **Aesthetic:** Premium/Apple-inspired clean design
- **Icons:** lucide-react only
- **Components:** shadcn/ui (Radix-based)
- **Colors:** Tailwind default palette with primary accent
- **Typography:** Clean, modern sans-serif

## Next Steps (Per plan.md)
1. ✅ Polish landing page dashboard preview
2. ⚠️  Implement better empty states/onboarding for new users
3. ⚠️  Create deployment documentation (DEPLOY.md)
4. ⚠️  Take marketing screenshots
5. ⚠️  Record 60s demo video

## Useful Commands
```bash
# Supabase
~/bin/supabase status              # Check status
~/bin/supabase stop                # Stop services
open http://127.0.0.1:54323        # Open Studio

# Database
~/bin/supabase db reset            # Reset local DB
~/bin/supabase db push             # Push migrations

# Development
npm run dev                        # Start Next.js
npm run build                      # Build for production
npm run lint                       # Run linter
```

## Code Patterns to Follow
- Use tRPC procedures for all API calls (no direct fetch)
- Always use TypeScript (avoid `any` types)
- Components should be in `src/components/[feature]/`
- Use Tailwind for all styling
- Follow Next.js 15 patterns (App Router preferred)
- Background jobs go in `src/inngest/`

## Important Notes
- **Sale Prep:** Code is being polished for sale, focus on "no broken feelings"
- **First Impressions:** Dashboard empty states are critical
- **Performance:** Video trimming uses smart single-pass algorithm
- **Analytics:** Clustering uses silhouette scores and WCSS metrics
