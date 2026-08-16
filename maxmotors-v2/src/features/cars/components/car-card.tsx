import Image from "next/image";
import Link from "next/link";
import { Fuel, Gauge, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { SaveCarButton } from "./save-car-button";
import { routes } from "@/config/routes";
import { formatNumber, formatYear } from "@/lib/format";
import { createTranslator } from "@/i18n";
import type { CarWithSavedState } from "@/server/modules/cars/client";
import type { Locale } from "@/config/site";

interface CarCardProps {
  car: CarWithSavedState;
  locale?: Locale;
  /** Hint for `sizes`; the first row of cards is above the fold. */
  priority?: boolean;
}

/**
 * A server component. Only the save button ships JavaScript, so a listing of
 * 12 cars costs one small island rather than 12 hydrated card components.
 */
export function CarCard({ car, locale = "ar", priority = false }: CarCardProps) {
  const t = createTranslator(locale);
  const cover = car.images[0];

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={routes.car(car.id)} className="block">
        <div className="relative aspect-[4/3] bg-surface-raised">
          {cover ? (
            <Image
              src={cover}
              alt={`${car.make} ${car.model} ${car.year}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {t("common.noResults")}
            </div>
          )}

          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {car.featured ? (
                <Badge variant="brand">{t("cars.fields.featured")}</Badge>
              ) : null}
              {car.status !== "AVAILABLE" ? (
                <Badge variant="warning">{t(`cars.status.${car.status}`)}</Badge>
              ) : null}
            </div>

            <SaveCarButton
              carId={car.id}
              initialSaved={car.isSaved}
              labels={{ save: t("cars.save"), unsave: t("cars.unsave") }}
            />
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="truncate font-semibold">
              {car.make} {car.model}
            </h3>
            <p className="text-sm text-muted">
              {formatYear(car.year)}
              {car.category ? ` · ${car.category}` : ""}
            </p>
          </div>

          <Price
            value={car.price}
            locale={locale}
            fallback={t("common.onRequest")}
            className="text-lg font-bold text-brand"
          />

          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <div className="flex items-center gap-1">
              <Gauge className="size-3.5" aria-hidden />
              <dt className="sr-only">{t("cars.fields.mileage")}</dt>
              <dd className="numeric">{formatNumber(car.mileage, locale)}</dd>
            </div>
            <div className="flex items-center gap-1">
              <Fuel className="size-3.5" aria-hidden />
              <dt className="sr-only">{t("cars.fields.fuelType")}</dt>
              <dd>{car.fuelType}</dd>
            </div>
            <div className="flex items-center gap-1">
              <Settings2 className="size-3.5" aria-hidden />
              <dt className="sr-only">{t("cars.fields.transmission")}</dt>
              <dd>{car.transmission}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </Card>
  );
}
