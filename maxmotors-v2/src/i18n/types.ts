import type { Dictionary } from "./dictionaries/ar";

/**
 * Same shape as the Arabic dictionary, but every leaf widened from its literal
 * to `string`. Without this, `en` would have to repeat the Arabic text verbatim
 * to satisfy the `as const` literal types.
 *
 * The practical effect: a missing key or a stray extra key in a translation is
 * a type error, not a `undefined` rendered into the page.
 */
export type Translations = {
  [K in keyof Dictionary]: Dictionary[K] extends string
    ? string
    : { [P in keyof Dictionary[K]]: Dictionary[K][P] extends string
        ? string
        : { [Q in keyof Dictionary[K][P]]: string } };
};

export type { Dictionary };
