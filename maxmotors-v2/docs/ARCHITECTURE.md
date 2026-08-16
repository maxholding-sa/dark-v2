# Architecture

## The one rule

Dependencies point in one direction. Nothing ever points back.

```
app/  ──▶  features/  ──▶  server/modules/  ──▶  server/db/
 │           │                  │
 └───────────┴──────────────────┴──────────▶  lib/  ·  config/  ·  i18n/
```

- A **page** may call a **service** or render a **feature component**.
- A **feature component** may call a **server action**.
- A **service** may call its **repository** and the **auth** layer.
- A **repository** may call **Prisma**.
- Nothing above `server/` may import Prisma. ESLint fails the build if it does.

Everything else follows from that.

## Layers

| Layer | Path | May do | May never do |
|---|---|---|---|
| Routes | `src/app/**` | Render, read via services, set metadata | Query the database, hold business rules |
| Features | `src/features/<domain>/**` | Client components, call actions | Import Prisma, decide permissions |
| Actions | `src/server/modules/<d>/*.actions.ts` | Wrap a service in `toResult`, revalidate | Validate, authorise, query |
| Services | `src/server/modules/<d>/*.service.ts` | Validate, authorise, orchestrate, map to DTOs | Build SQL, touch React |
| Repositories | `src/server/modules/<d>/*.repository.ts` | Prisma queries | Authorise, format, throw domain errors |
| Shared | `src/lib/**` | Pure functions | Import from `server/` or `app/` |

## Why each boundary exists

**Actions are transport, not logic.** A server action is a POST endpoint with a
nicer syntax. Putting rules inside one means they can only be tested by
simulating a request. Every action here is four lines: call the service, wrap
the result, revalidate, return.

**Services own the decisions.** Validation, permission checks and orchestration
live in one file per domain. A service takes `unknown`, parses it, and from that
point on works with typed data. It is a plain async function, so a test calls it
directly.

**Repositories own the queries.** They return raw Prisma rows and know nothing
about who is asking. That is what lets a service test substitute a fake
repository and run without a database.

**DTOs cross the boundary, models do not.** `CarDto` is a separate type from
Prisma's `Car`: `price` is a `number` rather than a `Decimal`, dates are ISO
strings. Prisma models do not survive React serialisation, so mapping is
mandatory — making the DTO a distinct type turns "forgot to map" into a compile
error instead of a runtime crash.

## The Result contract

Every server action returns:

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code, messageKey, fieldErrors? } };
```

Discriminated on `ok`, so reading `result.data` without checking `result.ok`
does not compile. Errors carry a **translation key**, never a sentence — the UI
picks the wording and the language, and a database message can never reach a
user.

Services signal failure by throwing `AppError`. `toResult` catches it, maps the
code, and logs. Anything that is not an `AppError` becomes a generic `INTERNAL`
with the real cause logged server-side only.

## Adding a feature

Copy the cars module. In order:

1. `src/server/modules/<domain>/<domain>.schema.ts` — Zod schemas. Types are
   derived with `z.infer`, never written by hand.
2. `<domain>.types.ts` — the DTO and its mapper.
3. `<domain>.repository.ts` — Prisma queries, no rules.
4. `<domain>.service.ts` — validation, `requirePermission`, orchestration.
5. `<domain>.actions.ts` — `"use server"`, `toResult`, `revalidatePath`.
6. `index.ts` — the public surface. Callers import from here and nowhere else.
7. `src/features/<domain>/components/**` — UI.
8. `tests/modules/<domain>-*.test.ts` — schema and service tests.

Add copy to `src/i18n/dictionaries/ar.ts` first; `en.ts` will fail to compile
until it is translated, which is the point.

## Conventions

- **Reads happen in pages, writes happen in actions.** A page calls the service
  directly. Wrapping a read in an action turns a cacheable render into a POST.
- **URL is the source of truth for list state.** Filters, sort and page live in
  the query string so results are linkable, indexable and back-button-correct.
- **Server components by default.** `"use client"` only for a component that
  needs an event handler or state, and pushed as far down the tree as it goes.
- **No `any`.** ESLint rejects it. Use `unknown` at boundaries and parse.
