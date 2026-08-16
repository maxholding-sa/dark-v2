import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/config/env";
import { AppError } from "@/server/errors/app-error";
import { logger } from "@/lib/logger";

/**
 * Supabase is used for file storage only — Prisma owns every read and write of
 * application data. v1 kept three Supabase clients alongside Prisma, which
 * meant two answers to "where does a car come from" and filters that behaved
 * differently depending on which path a page happened to take.
 */

let cachedClient: SupabaseClient | null = null;

function storageClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = serverEnv().SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw AppError.internal(
      "Supabase storage is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

function bucket(): string {
  return serverEnv().SUPABASE_STORAGE_BUCKET;
}

export interface UploadedFile {
  path: string;
  publicUrl: string;
}

/**
 * Uploads one object and returns its public URL. Callers pass an already-built
 * path so naming stays a domain decision (e.g. `cars/<id>/<uuid>.webp`) rather
 * than something the storage layer invents.
 */
export async function uploadFile(
  path: string,
  file: ArrayBuffer | Uint8Array | Blob,
  contentType: string,
): Promise<UploadedFile> {
  const client = storageClient();

  const { error } = await client.storage.from(bucket()).upload(path, file, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) {
    logger.error("storage.upload.failed", { path, error });
    throw AppError.external("Supabase storage", error);
  }

  const { data } = client.storage.from(bucket()).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/**
 * Best-effort cleanup. A failed delete leaves an orphaned object but must not
 * fail the surrounding transaction — the record is what users see.
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const { error } = await storageClient().storage.from(bucket()).remove(paths);
  if (error) logger.warn("storage.delete.failed", { paths, error });
}

/**
 * Recovers the storage path from a stored public URL, so deleting a car can
 * clean up its images without a second column tracking paths.
 */
export function storagePathFromUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${bucket()}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : publicUrl.slice(index + marker.length);
}
