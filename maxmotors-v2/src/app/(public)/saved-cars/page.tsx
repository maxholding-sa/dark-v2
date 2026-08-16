import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { getSavedCars } from "@/server/modules/cars";
import { CarCard } from "@/features/cars/components/car-card";
import { EmptyState } from "@/components/ui/empty-state";
import { createTranslator } from "@/i18n";

export const metadata: Metadata = {
  title: "المفضلة",
  robots: { index: false, follow: false },
};

export default async function SavedCarsPage() {
  const t = createTranslator();

  // The middleware guarantees a signed-in user on this route; the service
  // re-checks anyway, because a server action has no middleware in front of it.
  const cars = await getSavedCars();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("nav.savedCars")}</h1>

      {cars.length === 0 ? (
        <EmptyState icon={Heart} title={t("cars.empty")} description={t("cars.emptyHint")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <CarCard key={car.id} car={{ ...car, isSaved: true }} />
          ))}
        </div>
      )}
    </div>
  );
}
