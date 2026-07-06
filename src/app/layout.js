import React from "react";
import "./globals.css";
import { Cairo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { SITE_CONFIG } from "@/lib/seo";
import Script from "next/script";
import ClientWrapper from "@/components/ClientWrapper";
import { headers } from "next/headers";
import { getLogoByType, getPixelSettings, getFooterData, getAboutPage } from "@/actions/site-management";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

export const metadata = {
  title: {
    default: SITE_CONFIG.name,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  metadataBase: new URL(SITE_CONFIG.url),
  alternates: {
    canonical: "/",
    languages: {
      "ar-SA": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_CONFIG.locale,
    url: SITE_CONFIG.url,
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    siteName: SITE_CONFIG.name,
    images: [{
      url: SITE_CONFIG.defaultOgImage,
      width: 1200,
      height: 630,
      alt: SITE_CONFIG.name,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.defaultOgImage],
    creator: SITE_CONFIG.twitterHandle,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
  },
  icons: {
    icon: "/logo.JPG",
    shortcut: "/logo.JPG",
    apple: "/logo.JPG",
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({ children }) {
  const headerList = await headers();
  const pathname = headerList.get("x-invoke-path") || "";
  const isSignUpPage = pathname.includes("/sign-up");

  // Fetch all layout data on server in parallel. Logos/pixels use actions that catch DB errors;
  // these raw queries must not crash the whole app when the DB is unreachable (e.g. Supabase paused, network).
  const [navLogoRes, footerLogoRes, pixelSettingsRes, footerDbRes, aboutPageRes] = await Promise.all([
    getLogoByType("navbar"),
    getLogoByType("footer"),
    getPixelSettings(),
    getFooterData(),
    getAboutPage(),
  ]);

  const socialLinks = footerDbRes?.socialLinks || [];
  const storeInfo = footerDbRes?.storeInfo || null;

  const pixels = pixelSettingsRes?.data || {};

  const navLogo = navLogoRes?.data;
  const aboutNavLabel = aboutPageRes?.data?.title || "من نحن";
  const footerData = {
    logo: footerLogoRes?.data,
    socialLinks: socialLinks || [],
    storeInfo: storeInfo,
    aboutNavLabel,
  };

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localization={arSA}
    >
      <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#000000" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
          <link rel="preconnect" href="https://zafndavpzgpcbqgvosbt.supabase.co" />
        </head>
        <body
          className={`${cairo.variable} ${cairo.className} dark text-white antialiased`}
          style={{
            backgroundColor: "black",
            fontFamily: "var(--font-cairo), Cairo, Tahoma, Arial, sans-serif",
          }}
          suppressHydrationWarning
        >
          <ClientWrapper
            isSignUpPage={isSignUpPage}
            navLogo={navLogo}
            aboutNavLabel={aboutNavLabel}
            footerData={footerData}
          >
            {children}
          </ClientWrapper>

          {/* Tracking Pixels & Analytics */}

          {/* Google Analytics & Ads */}
          {(pixels.googleAnalytics || process.env.NEXT_PUBLIC_GA_ID) && (
            <>
              <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${pixels.googleAnalytics || process.env.NEXT_PUBLIC_GA_ID}`}
              />
              <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${pixels.googleAnalytics || process.env.NEXT_PUBLIC_GA_ID}', {
                      page_path: window.location.pathname,
                      page_title: document.title,
                      language: 'ar',
                      region: 'SA'
                      ${pixels.googleAdsId ? `, 'send_to': '${pixels.googleAdsId}'` : ""}
                    });
                  `,
                }}
              />
            </>
          )}

          {/* Facebook Pixel */}
          {pixels.facebookPixel && (
            <>
              <Script
                id="fb-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${pixels.facebookPixel}');
                    fbq('track', 'PageView');
                  `,
                }}
              />
              <noscript>
                <img
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  src={`https://www.facebook.com/tr?id=${pixels.facebookPixel}&ev=PageView&noscript=1`}
                />
              </noscript>
            </>
          )}

          {/* TikTok Pixel */}
          {pixels.tiktokPixel && (
            <Script
              id="tiktok-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function (w, d, t) {
                    w.Tawk_API = w.Tawk_API || {};
                    w.ttq = w.ttq || [];
                    w.ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "trackWithQuery", "click", "updateId"];
                    w.ttq.setAndDefer = function (t, e) {
                      t[e] = function () {
                        t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
                      }
                    };
                    for (var i = 0; i < w.ttq.methods.length; i++) w.ttq.setAndDefer(w.ttq, w.ttq.methods[i]);
                    w.ttq.instance = function (t) {
                      for (var e = w.ttq._i[t] || [], n = 0; n < w.ttq.methods.length; n++) w.ttq.setAndDefer(e, w.ttq.methods[n]);
                      return e
                    };
                    w.ttq.load = function (e, n) {
                      var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
                      w.ttq._i = w.ttq._i || {}, w.ttq._i[e] = [], w.ttq._i[e]._u = i, w.ttq._t = w.ttq._t || {}, w.ttq._t[e] = +new Date, w.ttq._o = w.ttq._o || {}, w.ttq._o[e] = n || {};
                      var o = d.createElement("script");
                      o.type = "text/javascript", o.async = !0, o.src = i + "?sdkid=" + e + "&lib=" + t;
                      var a = d.getElementsByTagName("script")[0];
                      a.parentNode.insertBefore(o, a)
                    };
                    w.ttq.load('${pixels.tiktokPixel}');
                    w.ttq.page();
                  }(window, document, 'ttq');
                `,
              }}
            />
          )}

          {/* Snapchat Pixel */}
          {pixels.snapchatPixel && (
            <Script
              id="snapchat-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
                  {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
                  a.queue=[];var r=t.createElement(n);r.async=!0;
                  r.src="https://sc-static.net/scevent.min.js";
                  var s=t.getElementsByTagName(n)[0];
                  s.parentNode.insertBefore(r,s)})(window,document,"script");
                  snaptr('init', '${pixels.snapchatPixel}');
                  snaptr('track', 'PAGE_VIEW');
                `,
              }}
            />
          )}

          {/* Microsoft Clarity */}
          {pixels.microsoftClarity && (
            <Script
              id="microsoft-clarity"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(c,l,a,r,i,t,y){
                      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  })(window, document, "clarity", "script", "${pixels.microsoftClarity}");
                `,
              }}
            />
          )}

          {/* Klaviyo Script */}
          <Script
            id="klaviyo-script"
            strategy="lazyOnload"
            src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=pk_686aed2d660777c2c5a332503b574bea12"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
