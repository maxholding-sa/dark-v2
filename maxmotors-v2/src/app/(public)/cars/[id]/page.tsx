import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCar, getSimilarCars } from "@/server/modules/cars";
import { isAppError } from "@/server/errors/app-error";
import { CarCard } from "@/features/cars/components/car-card";
import { SaveCarButton } from "@/features/cars/components/save-car-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { createTranslator } from "@/i18n";
import { formatNumber, formatYear, truncate } from "@/lib/format";
import { siteConfig } from "@/config/site";
import type { CarWithSavedState } from "@/server/modules/cars";

interface CarPageProps {
  params: Promise<{ id: string }>;
}

/** Returns null instead of throwing so both `generateMetadata` and the page
 *  can call it without duplicating the not-found handling. */
async function loadCar(id: string): Promise<CarWithSavedState | null> {
  try {
    return await getCar(id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

export async function generateMetadata({ params }: CarPageProps): Promise<Metadata> {
  const { id } = await params;
  const car = await loadCar(id);

  if (!car) return { title: "غير موجود" };

  const title = `${car.make} ${car.model} ${car.year}`;
  const description = truncate(car.description, 160);
  const image = car.images[0];

  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/cars/${car.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
  };
}

export default async function CarDetailPage({ params }: CarPageProps) {
  const t = createTranslator();
  const { id } = await params;

  const car = await loadCar(id);
  if (!car) notFound();

  const similar = await getSimilarCars(car.id, 3);
  const cover = car.images[0];

  const specs = [
    { label: t("cars.fields.year"), value: formatYear(car.year) },
    { label: t("cars.fields.mileage"), value: `${formatNumber(car.mileage)} كم` },
    { label: t("cars.fields.fuelType"), value: car.fuelType },
    { label: t("cars.fields.transmission"), value: car.transmission },
    { label: t("cars.fields.bodyType"), value: car.bodyType },
    { label: t("cars.fields.color"), value: car.color },
    ...(car.driveType ? [{ label: t("cars.fields.driveType"), value: car.driveType }] : []),
    ...(car.seats
      ? [{ label: t("cars.fields.seats"), value: formatNumber(car.seats) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      {/* Product structured data — this is what puts price and availability in
          the Google result rather than a bare blue link. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Car",
            name: `${car.make} ${car.model} ${car.year}`,
            brand: { "@type": "Brand", name: car.make },
            model: car.model,
            vehicleModelDate: String(car.year),
            mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileage, unitCode: "KMT" },
            fuelType: car.fuelType,
            vehicleTransmission: car.transmission,
            image: car.images,
            offers: {
              "@type": "Offer",
              price: car.price,
              priceCurrency: siteConfig.currency,
              availability:
                car.status === "AVAILABLE"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-raised">
            {cover ? (
              <Image
                src={cover}
                alt={`${car.make} ${car.model}`}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
                className="object-cover"
              />
            ) : null}
          </div>

          {car.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {car.images.slice(1, 9).map((image, index) => (
                <div
                  key={image}
                  className="relative aspect-square overflow-hidden rounded-md bg-surface-raised"
                >
                  <Image
                    src={image}
                    alt={`${car.make} ${car.model} — ${index + 2}`}
                    fill
                    sizes="(max-width: 1024px) 25vw, 15vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {car.make} {car.model}
              </h1>
              <p className="text-muted">
                {formatYear(car.year)}
                {car.category ? ` · ${car.category}` : ""}
              </p>
            </div>

            <SaveCarButton
              carId={car.id}
              initialSaved={car.isSaved}
              labels={{ save: t("cars.save"), unsave: t("cars.unsave") }}
              className="border border-border"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={car.status === "AVAILABLE" ? "success" : "warning"}>
              {t(`cars.status.${car.status}`)}
            </Badge>
            {car.isLuxury ? <Badge variant="brand">{t("cars.filters.luxury")}</Badge> : null}
            {car.isEconomic ? <Badge>{t("cars.filters.economic")}</Badge> : null}
          </div>

          <Price
            value={car.price}
            fallback={t("common.onRequest")}
            className="text-3xl font-bold text-brand"
          />

          <Card>
            <CardContent className="p-0">
              <dl className="divide-y divide-border">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <dt className="text-muted">{spec.label}</dt>
                    <dd className="font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <section className="space-y-2">
            <h2 className="font-semibold">{t("cars.fields.description")}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
              {car.description}
            </p>
          </section>
        </div>
      </div>

      {similar.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">{t("cars.similar")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <CarCard key={item.id} car={{ ...item, isSaved: false }} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
