import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { createTranslator } from "@/i18n";

export default function NotFound() {
  const t = createTranslator();

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <h1 className="text-xl font-bold">{t("errors.notFound")}</h1>
      <Button asChild>
        <Link href={routes.home}>{t("nav.home")}</Link>
      </Button>
    </div>
  );
}
