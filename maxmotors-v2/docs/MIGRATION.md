# Migrating from v1

The database is shared. `prisma/schema.prisma` and the migration history were
copied unchanged, so v2 reads and writes the same tables as the app in the
repository root. Both can run side by side during the port.

## What changed structurally

| v1 | v2 | Why |
|---|---|---|
| `src/actions/*.js` (19 files, up to 1,451 lines) | `src/server/modules/<domain>/` | One folder per domain, split by responsibility |
| `src/lib/prisma.js` imported by 41 files | `src/server/db/prisma.ts`, server-only | UI cannot reach the database |
| `superbase.js` + `supabaseClient.js` + `supabaseReads.js` | `src/server/db/storage.ts` | Prisma owns data; Supabase owns files only |
| `admin/site-data/` **and** `admin/site-management/` | one module | Two implementations of the same CMS |
| 116 hand-rolled `{ success: false }` | `Result<T>` + `AppError` | One contract, discriminated, typed |
| Zod in 3 files | schema per module, enforced at the edge | Validation cannot be skipped |
| 160 files with inline Arabic | `src/i18n/dictionaries/` | English becomes possible; copy edits are one file |
| `src/generated/prisma` committed | generated into `node_modules` | No platform binaries in git |
| `typescript.ignoreBuildErrors: true` | strict TS, errors fail the build | The point of the rebuild |
| No tests | Vitest, thresholds on `server/modules` and `lib` | The financing math needs a net |

## Porting order

Cars is done and is the reference. Suggested order after it, cheapest first:

1. **Site content** (`site-management` + `site-data`) — merge the two admin
   trees into one `site-content` module. Highest duplication, so the biggest
   reduction per hour.
2. **Reviews, articles, contacts** — plain CRUD; each is a near-copy of cars.
3. **Test drive & reservations** — CRUD plus a booking-status state machine.
4. **Banks & financing** — port `loan-calculator.js` (901 lines) into
   `modules/financing` **with tests first**. This is the money math; write the
   tests from `scripts/verify-apr-solver.mjs` and
   `scripts/verify-insurance-premium.mjs` before touching the logic.
5. **Loan requests** — depends on financing. `LoanRequestForm.jsx` is 2,176
   lines and should become a multi-step form with one component per step and the
   wizard state in a reducer.
6. **Chatbot** — port last. `actions/chatbot.js` (1,451 lines) pulls in eight
   other libs; split into `modules/chat` with separate intent-resolution,
   car-search and financing adapters.

## Per-feature checklist

- [ ] Schemas written; types derived with `z.infer`
- [ ] Repository holds queries only
- [ ] Service holds validation, `requirePermission`, orchestration
- [ ] Actions wrap in `toResult` and revalidate the right paths
- [ ] DTO mapper converts `Decimal` and `Date`
- [ ] Copy added to `ar.ts` **and** `en.ts`
- [ ] Tests for the schema and the service's rules
- [ ] `npm run check` passes

## Not yet ported

Called out so nothing is assumed done:

- Home page content (hero videos, carousels, brand strips) — the v2 home page
  renders featured cars only.
- Image upload UI. The form takes image URLs; the dropzone that uploads to
  Supabase Storage and appends the returned URL is not built. `uploadFile` in
  `src/server/db/storage.ts` is ready for it.
- Gemini image analysis, the chatbot, financing, articles, reviews, test drive,
  contacts, mandeb, featured brands/models, SEO sitemap, Arcjet rate limiting.
- Auth pages (`/sign-in`, `/sign-up`). Clerk's modal is wired in the header; the
  dedicated routes still need creating.
