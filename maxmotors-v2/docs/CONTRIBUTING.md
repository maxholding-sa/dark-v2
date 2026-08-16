# Contributing

## Before every push

```bash
npm run check
```

Typecheck, lint and tests. All three must pass — there is no `--force` path and
no `ignoreBuildErrors` escape hatch. If one of them is wrong, fix the rule, not
the code that trips it.

**Stop the dev server before running `npm run build`.** Both write to the same
`.next` directory, and a build run underneath a live dev server overwrites the
chunk manifests it is still serving. The page then fails with
`Cannot read properties of undefined (reading 'call')` from `webpack.js`, which
looks like a code bug and is not one. Recovery:

```bash
rm -rf .next && npm run dev
```

## Rules the tooling enforces

These are not style preferences; ESLint or `tsc` will fail on them.

- **No `any`.** Use `unknown` at a boundary and parse it into a type.
- **No database access above `src/server/`.** `no-restricted-imports` blocks
  `@prisma/client` and `@/server/db/*` everywhere else.
- **No `console.log`.** Use `logger` from `@/lib/logger`; `warn` and `error` are
  allowed directly where a logger would be circular.
- **No unused locals or parameters.** Prefix a deliberate one with `_`.

## Rules the tooling cannot enforce

- **A page reads, an action writes.** Never wrap a read in a server action.
- **Never build a `Result` by hand.** Return `toResult(...)` from an action and
  throw `AppError` from a service.
- **Never put a user-facing sentence in server code.** Errors carry a
  translation key; the UI resolves it.
- **Never add copy to a component.** It goes in `src/i18n/dictionaries/ar.ts`,
  and `en.ts` fails to compile until it is translated.
- **`"use client"` goes as deep as it can.** If a component needs it only for a
  button, extract the button.

## Commits

One logical change per commit. A commit that both moves a file and changes its
behaviour is two commits — the diff is unreviewable otherwise.

## Testing

What is worth a test:

- Every Zod schema — the accepted case, and each rejection you rely on.
- Every service rule — permission checks, not-found handling, state
  transitions.
- Every pure function in `lib/`.
- Anything involving money. Financing logic gets its tests written **before**
  the port.

What is not:

- Prisma itself, React rendering, or third-party libraries.

Substitute a fake repository to test a service; nothing in `tests/` should need
a database.
