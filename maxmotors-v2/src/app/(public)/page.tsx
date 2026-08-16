import Link from "next/link";
import { getFeaturedCars } from "@/server/modules/cars";
import { CarCard } from "@/features/cars/components/car-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { createTranslator } from "@/i18n";

/**
 * Placeholder home page.
 *
 * The v1 home page is 390 lines of hero videos, carousels, brand strips and
 * review sliders driven by the site-settings tables. Porting it belongs to the
 * site-content module, not the cars slice — this renders featured stock so the
 * route exists and the cars pipeline is visible end to end.
 */
export default async function HomePage() {
  const t = createTranslator();
  const featured = await getFeaturedCars(6);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("common.appName")}</h1>
        <p className="text-muted">{t("cars.subtitle")}</p>
        <Button asChild size="lg">
          <Link href={routes.cars}>{t("nav.cars")}</Link>
        </Button>
      </section>

      {featured.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">{t("cars.fields.featured")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((car, index) => (
              <CarCard key={car.id} car={{ ...car, isSaved: false }} priority={index < 3} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
