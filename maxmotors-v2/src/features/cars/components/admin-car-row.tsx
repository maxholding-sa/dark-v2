"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/hooks/use-action";
import { createTranslator } from "@/i18n";
import { routes } from "@/config/routes";
import { formatAmount, formatYear } from "@/lib/format";
import {
  deleteCarAction,
  updateCarStatusAction,
  type CarDto,
} from "@/server/modules/cars/client";

/**
 * One admin table row. A client component because it owns the destructive
 * action; the surrounding table stays a server component.
 */
export function AdminCarRow({ car }: { car: CarDto }) {
  const router = useRouter();
  const t = React.useMemo(() => createTranslator("ar"), []);

  const remove = useAction(deleteCarAction, {
    successKey: "admin.cars.deleted",
    onSuccess: () => router.refresh(),
  });

  const toggleFeatured = useAction(updateCarStatusAction, {
    successKey: "admin.cars.statusUpdated",
    onSuccess: () => router.refresh(),
  });

  async function handleDelete() {
    // A browser confirm is deliberate here: it cannot be dismissed by a stray
    // click the way a custom modal can, and deleting a car is irreversible.
    if (!window.confirm(t("admin.cars.deleteConfirm"))) return;
    await remove.execute(car.id);
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">
        <p className="font-medium">
          {car.make} {car.model}
        </p>
        <p className="text-xs text-muted">{formatYear(car.year)}</p>
      </td>

      <td className="px-3 py-2 numeric">{formatAmount(car.price)}</td>

      <td className="px-3 py-2">
        <Badge variant={car.status === "AVAILABLE" ? "success" : "warning"}>
          {t(`cars.status.${car.status}`)}
        </Badge>
      </td>

      <td className="px-3 py-2">
        <Button
          variant={car.featured ? "primary" : "outline"}
          size="sm"
          isLoading={toggleFeatured.isPending}
          onClick={() => toggleFeatured.execute(car.id, { featured: !car.featured })}
        >
          {t("cars.fields.featured")}
        </Button>
      </td>

      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.admin.carEdit(car.id)} aria-label={t("common.edit")}>
              <Pencil className="size-4" aria-hidden />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            isLoading={remove.isPending}
            onClick={handleDelete}
            aria-label={t("common.delete")}
          >
            <Trash2 className="size-4 text-danger" aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  );
}
