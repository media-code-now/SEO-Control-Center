# SEO Control Center

Compact SEO control dashboard built with Next.js 14 App Router, Prisma, NextAuth, Tailwind, shadcn/ui, and Recharts.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and populate the secrets.
3. Launch Postgres via Docker Compose:
   ```bash
   docker compose up -d
   ```
4. Run migrations and seed data:
   ```bash
   npx prisma migrate dev --name init_core_schema
   npm run db:seed
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` – Next.js dev server
- `npm run build` / `npm run start` – production build & serve
- `npm run lint` – ESLint with strict settings
- `npm run typecheck` – TypeScript type checking
- `npm run prisma:*` – Prisma helpers, plus `npm run db:seed`

## Structure Highlights

- `app/` – App Router routes, server actions, API handlers
- `components/` – shadcn/ui primitives plus feature widgets
- `lib/` – Prisma client, NextAuth config, helpers
- `prisma/` – schema and migrations
- `scripts/` – database seed logic
- `styles/` – Tailwind layer definitions

## Deployment Notes

- `vercel.json` defines a Vercel Cron job hitting `/api/cron/sync` hourly.
- `CRON_JOB_TOKEN` must match the header sent by Vercel Cron to avoid unauthorized syncs.

## Database Utilities

- Validate schema: `npx prisma validate`
- Inspect data: `npx prisma studio`
