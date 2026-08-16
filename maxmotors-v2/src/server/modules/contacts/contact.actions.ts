"use server";

import { revalidatePath } from "next/cache";
import * as service from "./contact.service";
import { toResult, type Result } from "@/server/errors/result";

export async function submitContactAction(input: unknown): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    const result = await service.submitContact(input);
    revalidatePath("/admin/contacts");
    return result;
  });
}

export async function deleteContactAction(id: string): Promise<Result<{ id: string }>> {
  return toResult(async () => {
    await service.deleteContact(id);
    revalidatePath("/admin/contacts");
    return { id };
  });
}
