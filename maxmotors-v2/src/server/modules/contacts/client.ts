/** Client-safe surface of the contacts module. */

export { submitContactAction, deleteContactAction } from "./contact.actions";

export {
  contactInputSchema,
  contactQuerySchema,
  parseContactQuery,
} from "./contact.schema";

export type { ContactInput, ContactQuery } from "./contact.schema";
export type { ContactDto } from "./contact.service";
