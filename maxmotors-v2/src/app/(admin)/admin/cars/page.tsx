import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { listCarsForAdmin, parseCarQuery } from "@/server/modules/cars";
import { AdminCarRow } from "@/features/cars/components/admin-car-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buildCarsHref } from "@/features/cars/lib/car-search-params";
import { routes } from "@/config/routes";
import { createTranslator } from "@/i18n";

interface AdminCarsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCarsPage({ searchParams }: AdminCarsPageProps) {
  const t = createTranslator();
  const query = parseCarQuery(await searchParams);

  // Throws FORBIDDEN if the signed-in editor lacks `cars.view`; the nearest
  // error boundary renders it.
  const page = await listCarsForAdmin(query);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.cars.title")}</h1>
          <p className="text-sm text-muted">{t("cars.resultsCount", { count: page.total })}</p>
        </div>

        <Button asChild>
          <Link href={routes.admin.carCreate}>
            <Plus className="size-4" aria-hidden />
            {t("admin.cars.create")}
          </Link>
        </Button>
      </header>

      {page.items.length === 0 ? (
        <EmptyState icon={Car} title={t("cars.empty")} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-start">
                  {t("cars.fields.model")}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t("cars.fields.price")}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t("cars.fields.status")}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t("cars.fields.featured")}
                </th>
                <th scope="col" className="px-3 py-2 text-end">
                  <span className="sr-only">{t("common.edit")}</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {page.items.map((car) => (
                <AdminCarRow key={car.id} car={car} />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination
        page={page}
        buildHref={(target) =>
          buildCarsHref(query, { page: String(target) }, routes.admin.cars)
        }
        labels={{ previous: t("common.previous"), next: t("common.next") }}
      />
    </div>
  );
}
