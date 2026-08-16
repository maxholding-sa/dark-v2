import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { Toaster } from "sonner";
import { siteConfig } from "@/config/site";
import "@/styles/globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.nameAr,
    template: `%s | ${siteConfig.nameAr}`,
  },
  description: "معرض سيارات — بيع وتمويل السيارات في المملكة العربية السعودية",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: siteConfig.nameAr,
    url: siteConfig.url,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={arSA}>
      <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
        <body className="min-h-dvh bg-background font-sans antialiased">
          {children}
          <Toaster position="top-center" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
