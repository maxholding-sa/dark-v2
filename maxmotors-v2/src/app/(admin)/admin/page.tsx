import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { createTranslator } from "@/i18n";

export default function AdminHomePage() {
  const t = createTranslator();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.admin")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={routes.admin.cars}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>{t("admin.cars.title")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">{t("cars.subtitle")}</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
