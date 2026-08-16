/**
 * The server surface of the cars module.
 *
 * Pages and server components import from `@/server/modules/cars`; never from
 * a file inside it. That keeps the repository private and lets the internals be
 * reorganised without touching a call site.
 *
 * Client components must import from `@/server/modules/cars/client` instead —
 * this barrel pulls in the service, which is `server-only`.
 */

export {
  listCars,
  listCarsForAdmin,
  getCar,
  getSimilarCars,
  getFeaturedCars,
  getFilterOptions,
  getSavedCars,
} from "./car.service";

// Actions, schemas and types are useful on the server too.
export * from "./client";
