import "server-only";

import type { Contact } from "@prisma/client";
import * as repository from "./contact.repository";
import {
  contactInputSchema,
  contactIdSchema,
  type ContactQuery,
} from "./contact.schema";
import { AppError } from "@/server/errors/app-error";
import { parseOrThrow } from "@/server/errors/validate";
import { requirePermission } from "@/server/auth/session";
import { PERMISSIONS } from "@/config/routes";
import { enforceRateLimit } from "@/server/rate-limit";
import { getClientIdentifier } from "@/server/request-context";
import { paginate, type Paginated } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export interface ContactDto {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

function toContactDto(contact: Contact): ContactDto {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    subject: contact.subject,
    message: contact.message,
    createdAt: contact.createdAt.toISOString(),
  };
}

/**
 * Public submission.
 *
 * Two guards, in order: the honeypot rejects the naive bots for free, and the
 * rate limiter caps whatever gets past it. Both fail with the same generic
 * message so a probe cannot tell which one it tripped.
 */
export async function submitContact(input: unknown): Promise<{ id: string }> {
  const identifier = await getClientIdentifier();
  enforceRateLimit(identifier, { name: "contact", limit: 5, windowMs: 60 * 60 * 1000 });

  const data = parseOrThrow(contactInputSchema, input, "contact message");

  const contact = await repository.create({
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
  });

  // The email is deliberately not logged — it is the visitor's personal data
  // and the record itself is the durable copy.
  logger.info("contact.submitted", { contactId: contact.id });

  return { id: contact.id };
}

export async function listContacts(
  query: ContactQuery,
): Promise<Paginated<ContactDto>> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { contacts, total } = await repository.findMany(query, {
    page: query.page,
    limit: query.limit,
  });

  return paginate(contacts.map(toContactDto), total, {
    page: query.page,
    limit: query.limit,
  });
}

export async function getContact(id: string): Promise<ContactDto> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const contact = await repository.findById(parseOrThrow(contactIdSchema, id, "id"));
  if (!contact) throw AppError.notFound("Contact");

  return toContactDto(contact);
}

export async function deleteContact(id: string): Promise<void> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const contactId = parseOrThrow(contactIdSchema, id, "id");
  const contact = await repository.findById(contactId);
  if (!contact) throw AppError.notFound("Contact");

  await repository.remove(contactId);
  logger.info("contact.deleted", { contactId });
}

/** Message count in the last 24h, for the admin overview. */
export async function getRecentContactCount(): Promise<number> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return repository.countSince(since);
}
