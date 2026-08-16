/**
 * Single source of truth for URLs. v1 spread route strings across the router,
 * the middleware matcher, the sidebar and the permission table, so adding an
 * admin page meant editing four unrelated files and usually forgetting one.
 */

export const routes = {
  home: "/",
  cars: "/cars",
  car: (id: string) => `/cars/${id}`,
  savedCars: "/saved-cars",
  signIn: "/sign-in",
  signUp: "/sign-up",

  admin: {
    root: "/admin",
    cars: "/admin/cars",
    carCreate: "/admin/cars/create",
    carEdit: (id: string) => `/admin/cars/${id}/edit`,
  },
} as const;

/** Routes that require a signed-in user. Consumed by the middleware matcher. */
export const protectedRoutePatterns = [
  "/admin(.*)",
  "/saved-cars(.*)",
  "/reservations(.*)",
] as const;

/**
 * Permission ids. A route is guarded by declaring it here and referencing the
 * id from the module service — never by an ad-hoc role check inside a page.
 */
export const PERMISSIONS = {
  CARS_VIEW: "cars.view",
  CARS_CREATE: "cars.create",
  CARS_UPDATE: "cars.update",
  CARS_DELETE: "cars.delete",
  LOANS_VIEW: "loans.view",
  LOANS_MANAGE: "loans.manage",
  SETTINGS_MANAGE: "settings.manage",
  USERS_MANAGE: "users.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
