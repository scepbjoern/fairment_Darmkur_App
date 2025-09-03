# Fairment Darmkur Tagebuch (MVP)

Mobile-first PWA to track daily Darmkur data and view basic analytics.

## Stack
- Next.js (App Router), React, Tailwind CSS
- Prisma + PostgreSQL
- PWA (manifest + service worker)

## Setup
1. Copy `.env.example` to `.env` and adjust `DATABASE_URL`.
2. Install deps:
   ```bash
   npm i
   ```
3. Generate Prisma client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Seed demo data (user + 12 standard habits):
   ```bash
   npm run seed
   ```
5. Dev server:
   ```bash
   npm run dev
   ```

Login is mocked via a demo user; the Heute page uses mock API routes to persist interactions for the session.

## Scripts
- `npm run seed` — creates demo user and 12 standard habits in DB.

## Notes
- API routes currently use an in-memory mock DB for fast iteration. Swap to Prisma in route handlers in a later step.
- PWA includes a minimal service worker and manifest.
