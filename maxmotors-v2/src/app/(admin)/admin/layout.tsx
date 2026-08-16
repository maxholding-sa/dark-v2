import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, LayoutDashboard } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { routes } from "@/config/routes";
import { createTranslator } from "@/i18n";

/**
 * The admin gate.
 *
 * The middleware only proves someone is signed in; role is checked here, once,
 * for the whole subtree. Individual pages then guard their *actions* through
 * `requirePermission` — a layout check alone would not stop a crafted request
 * to a server action.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const t = createTranslator();

  if (!user) redirect(routes.signIn);
  if (user.role === "USER") redirect(routes.home);

  const links = [
    { href: routes.admin.root, label: t("nav.admin"), icon: LayoutDashboard },
    { href: routes.admin.cars, label: t("admin.cars.title"), icon: Car },
  ];

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-e border-border bg-surface p-4 md:block">
        <p className="mb-6 px-2 text-lg font-bold text-brand">{t("common.appName")}</p>

        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-raised"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
