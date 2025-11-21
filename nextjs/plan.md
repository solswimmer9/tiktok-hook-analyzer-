# Project Master Plan: TikTok Hook Analyzer Sale Prep

## 1. Project Overview
**Type:** Next.js SaaS Application (T3 Stack: Next.js, tRPC, Tailwind, Prisma/Supabase)
**Goal:** Urgent sale of the codebase.
**Current State:** Functional MVP with AI analysis, clustering, and video scraping.
**Key Tech:** Gemini 1.5 Pro (AI), Inngest (Background Jobs), Supabase (DB/Auth).

## 2. Critical Context for AI Assistant
*   **Design System:** "Premium" aesthetic (Apple/Google inspired). Use `lucide-react` for icons, `shadcn/ui` for components.
*   **Architecture:**
    *   Frontend: `src/pages`, `src/components`
    *   Backend: `src/server/api/routers` (tRPC)
    *   Jobs: `src/inngest` (Critical for video processing)
    *   Services: `src/server/services` (Clustering, etc.)
*   **Current Focus:** Polishing for sale, ensuring no "broken" feelings for new users (buyers).

## 3. Action Checklist
### Phase 1: First Impressions (The "Buyer" Flow)
- [ ] **Landing Page Polish**
    - [ ] Verify "Dashboard Preview" image matches current UI.
    - [ ] Ensure "Get Started" links work and flow smoothly to dashboard (or login).
- [ ] **Empty State / Onboarding**
    - [ ] **CRITICAL:** The dashboard looks empty for new users. Implement a "Demo Data" seed script or a better empty state that guides the user to add their first search term.
    - [ ] Ensure the "Loading" states for the first analysis are clear and don't look like the app is broken.

### Phase 2: Visual & Code Quality
- [ ] **UI Refinement**
    - [ ] Check `src/pages/dashboard/tiktok/index.tsx` for consistent spacing and typography.
    - [ ] Verify mobile responsiveness for the dashboard.
- [ ] **Code Cleanup**
    - [ ] Fix `any` type usage in `src/server/api/routers/tiktok.ts` (ClusteringService instantiation).
    - [ ] Ensure all env vars are in `.env.example`.

### Phase 3: Documentation & Assets
- [ ] **Handover Documentation**
    - [ ] Update `README.md`: Add "Quick Start" for the buyer.
    - [ ] Create `DEPLOY.md`: Specific instructions for Vercel + Supabase + Inngest deployment.
- [ ] **Marketing Assets**
    - [ ] Take high-res screenshots of: Dashboard, Analysis View, Clustering View.
    - [ ] Record a 60s "Walkthrough" video demonstrating the "Search -> Analyze -> Cluster" flow.

## 4. Known Issues / Notes
- Clustering requires minimum 5 videos to work.
- Inngest must be running locally (`npx inngest-cli@latest dev`) for jobs to process.
