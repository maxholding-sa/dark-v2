import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { createTranslator } from "@/i18n";
import { siteConfig } from "@/config/site";

/**
 * Chrome for every public page. The route group `(public)` keeps this layout
 * off the admin and auth trees without adding a `/public` segment to any URL.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = createTranslator();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href={routes.home} className="text-lg font-bold text-brand">
            {siteConfig.nameAr}
          </Link>

          <nav className="flex items-center gap-1" aria-label={t("nav.home")}>
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.cars}>{t("nav.cars")}</Link>
            </Button>

            <SignedIn>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.savedCars}>{t("nav.savedCars")}</Link>
              </Button>
              <UserButton />
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm">{t("nav.signIn")}</Button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} {siteConfig.nameAr}
      </footer>
    </div>
  );
}
