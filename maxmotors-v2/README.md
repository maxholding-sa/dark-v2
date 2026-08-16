# Max Motors v2

Rebuild of the Max Motors dealership platform: TypeScript strict, layered
domain modules, validated at every boundary, tested where it matters.

Same stack as v1 — Next.js 15 App Router, Prisma on Supabase Postgres, Clerk,
Tailwind v4 — reorganised so it can keep growing.

## Getting started

```bash
npm install
```

Copy the environment contract and fill it in:

```bash
cp .env.example .env
```

Generate the Prisma client and start the dev server:

```bash
npm run db:generate && npm run dev
```

The database is shared with v1 — no migration is needed to run this locally.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + production build |
| `npm run check` | Typecheck, lint and test — run before every push |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run test:coverage` | Coverage against the thresholds in `vitest.config.ts` |
| `npm run db:studio` | Prisma Studio |

## Layout

```
src/
  app/               Routes only — thin, no business logic
    (public)/        Public site
    (admin)/         Admin, role-gated in its layout
  server/            Server-only. Never imported by client code.
    db/              Prisma client, Supabase storage
    auth/            Session, permissions
    errors/          AppError, Result
    modules/<d>/     schema · types · repository · service · actions
  features/<d>/      Feature UI and client components
  components/ui/     Design-system primitives
  config/            env (Zod-validated), site, routes
  i18n/              Typed ar/en dictionaries
  lib/               Pure, dependency-free utilities
tests/               Vitest
docs/                ARCHITECTURE.md · MIGRATION.md
```

## Where to start reading

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the layering rules and why
   each boundary exists.
2. `src/server/modules/cars/` — the reference implementation. Every other
   domain should look like this.
3. [`docs/MIGRATION.md`](docs/MIGRATION.md) — what has been ported, what has
   not, and the suggested order.

## Status

Foundation and the **cars** vertical slice are complete: public listing with
URL-driven filters and pagination, detail page with structured data, saved
cars, and admin CRUD.

Everything else from v1 is still to port — see `docs/MIGRATION.md` for the
explicit list.
