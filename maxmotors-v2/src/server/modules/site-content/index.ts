/**
 * Server surface of the site-content module.
 *
 * Replaces v1's two parallel admin trees (`admin/site-data` and
 * `admin/site-management`), which implemented the same CMS twice — logo, store
 * info, social media and the about page each existed in both, with different
 * forms and different validation.
 */

export {
  getStoreInfo,
  getSocialLinks,
  getActiveLogo,
  getHeroSection,
  getPixelSettings,
  getAboutPage,
  getSiteChrome,
  getDealershipInfo,
  getAboutPageForAdmin,
  listAllSocialLinks,
  listLogos,
} from "./site-content.service";

export * from "./client";
