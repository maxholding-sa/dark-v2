/**
 * The client-safe surface of the cars module.
 *
 * Client components import from here; server components and pages import from
 * `./index`, which also re-exports everything below.
 *
 * The split is not cosmetic. `car.service.ts` starts with `import "server-only"`,
 * so anything that re-exports it cannot appear in a client component's module
 * graph — a single barrel would make `import { toggleSavedCarAction }` in a
 * button fail the build. Actions are safe because `"use server"` turns them
 * into RPC stubs on the client; schemas and types are pure.
 */

export {
  createCarAction,
  updateCarAction,
  updateCarStatusAction,
  deleteCarAction,
  toggleSavedCarAction,
} from "./car.actions";

export {
  carInputSchema,
  carUpdateSchema,
  carQuerySchema,
  parseCarQuery,
  SORT_OPTIONS,
} from "./car.schema";

export type {
  CarInput,
  CarUpdateInput,
  CarQuery,
  CarSortOption,
} from "./car.schema";

export type { CarDto, CarWithSavedState, CarFilterOptions } from "./car.types";
