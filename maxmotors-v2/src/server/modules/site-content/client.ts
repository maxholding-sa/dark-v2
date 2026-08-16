/** Client-safe surface of the site-content module. See `cars/client.ts`. */

export {
  updateStoreInfoAction,
  createSocialLinkAction,
  updateSocialLinkAction,
  deleteSocialLinkAction,
  createLogoAction,
  activateLogoAction,
  deleteLogoAction,
  updateHeroSectionAction,
  updateAboutPageAction,
  createAboutFeatureAction,
  updateAboutFeatureAction,
  deleteAboutFeatureAction,
  updatePixelSettingsAction,
  updateDealershipInfoAction,
  saveWorkingHoursAction,
} from "./site-content.actions";

export {
  storeInfoSchema,
  socialMediaSchema,
  logoSchema,
  heroSectionSchema,
  aboutPageSchema,
  aboutFeatureSchema,
  pixelSettingsSchema,
  dealershipInfoSchema,
  workingHourSchema,
  workingHoursSchema,
  SOCIAL_PLATFORMS,
  LOGO_TYPES,
  DAYS_OF_WEEK,
} from "./site-content.schema";

export type {
  StoreInfoInput,
  SocialMediaInput,
  LogoInput,
  HeroSectionInput,
  AboutPageInput,
  AboutFeatureInput,
  PixelSettingsInput,
  DealershipInfoInput,
  WorkingHourInput,
  SocialPlatform,
  LogoType,
  DayOfWeek,
} from "./site-content.schema";

export type {
  StoreInfoDto,
  SocialMediaDto,
  LogoDto,
  HeroSectionDto,
  AboutPageDto,
  AboutFeatureDto,
  PixelSettingsDto,
  WorkingHourDto,
  DealershipInfoDto,
  SiteChrome,
} from "./site-content.types";
