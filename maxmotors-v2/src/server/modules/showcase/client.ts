/** Client-safe surface of the showcase module. */

export {
  createFeaturedBrandAction,
  updateFeaturedBrandAction,
  deleteFeaturedBrandAction,
  reorderFeaturedBrandsAction,
  createFeaturedModelAction,
  updateFeaturedModelAction,
  deleteFeaturedModelAction,
  reorderFeaturedModelsAction,
  createMandebAction,
  updateMandebAction,
  deleteMandebAction,
} from "./showcase.actions";

export {
  featuredBrandSchema,
  featuredModelSchema,
  mandebSchema,
  reorderSchema,
} from "./showcase.schema";

export type {
  FeaturedBrandInput,
  FeaturedModelInput,
  MandebInput,
  ReorderInput,
} from "./showcase.schema";

export type { FeaturedItemDto, MandebDto } from "./showcase.types";
