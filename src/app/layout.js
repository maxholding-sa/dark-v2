import React from "react";
import "./globals.css";
import { Cairo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { generateJsonLd, SITE_CONFIG, absoluteUrl } from "@/lib/seo";
import Script from "next/script";
import ClientWrapper from "@/components/ClientWrapper";
import { getLogoByType, getPixelSettings, getFooterData, getAboutPage } from "@/actions/site-management";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

const isValidTikTokPixelId = (id) =>
  typeof id === "string" && /^[A-Z0-9]{10,}$/i.test(id.trim());

export async function generateMetadata() {
  // Share previews use the same logo the site header shows, so pasting the domain
  // into WhatsApp/X/Facebook renders the brand mark instead of a stock banner.
  const navLogoRes = await getLogoByType("navbar");
  const headerLogo = navLogoRes?.data?.imageUrl;
  const shareImage = headerLogo
    ? {
        // No width/height: the header logo is not a fixed 1200x630 banner, and
        // declaring dimensions that don't match makes scrapers letterbox it badly.
        url: absoluteUrl(headerLogo),
        alt: navLogoRes.data.altText || SITE_CONFIG.name,
      }
    : {
        url: absoluteUrl(SITE_CONFIG.defaultOgImage),
        width: SITE_CONFIG.ogImageWidth,
        height: SITE_CONFIG.ogImageHeight,
        alt: SITE_CONFIG.name,
      };

  return {
    title: {
      default: SITE_CONFIG.name,
      template: `%s | ${SITE_CONFIG.name}`,
    },
    description: SITE_CONFIG.description,
    metadataBase: new URL(SITE_CONFIG.url),
    keywords: [
      "ماكس موتورز",
      "maxmotors",
      "سيارات للبيع السعودية",
      "شراء سيارة",
      "تمويل سيارات",
      "حجز تجربة قيادة",
    ],
    alternates: {
      canonical: "/",
      languages: {
        "ar-SA": "/",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: SITE_CONFIG.locale,
      url: SITE_CONFIG.url,
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      siteName: SITE_CONFIG.name,
      images: [shareImage],
    },
    twitter: {
      // A logo is square-ish; "summary" shows it whole, "summary_large_image" crops it.
      card: headerLogo ? "summary" : "summary_large_image",
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      images: [shareImage.url],
      creator: SITE_CONFIG.twitterHandle,
    },
    verification: {
      google: "JGLgXvJvi4W4A8NgMdI99dGfG3XbDHc9ZBEJsqjF8bY",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black",
    },
    icons: {
      icon: "/logo.jpg",
      shortcut: "/logo.jpg",
      apple: "/logo.jpg",
    },
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({ children }) {
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
  const clarityId = pixels.microsoftClarity || "y7xj5lptrr";

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
          <link rel="preconnect" href="https://zafndavpzgpcbqgvosbt.supabase.co" />
          {/* Microsoft Clarity — in <head> so the session recording starts on first paint. */}
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${clarityId}");
              `,
            }}
          />
          {/* TikTok Pixel — hardcoded base pixel, loaded from the document head. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
                  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
                  ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

                  ttq.load('DA4N7MRC77U6T4LM0U8G');
                  ttq.page();
                }(window, document, 'ttq');
              `,
            }}
          />
          {/* Google Tag Manager */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-5DGZNFH6');
              `,
            }}
          />
          {/*
            Plain <script> tags, not next/script. `strategy="beforeInteractive"`
            defers injection to the client loader, so crawlers never saw these
            two blocks in the server HTML — the brand's Organization and WebSite
            entities were effectively invisible to Google.
          */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateJsonLd("organization")),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateJsonLd("searchAction")),
            }}
          />
        </head>
        <body
          className={`${cairo.variable} ${cairo.className} dark overflow-x-hidden text-white antialiased`}
          style={{
            backgroundColor: "black",
            fontFamily: "var(--font-cairo), Cairo, Tahoma, Arial, sans-serif",
          }}
          suppressHydrationWarning
        >
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-5DGZNFH6"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>

          <ClientWrapper
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  height="1"
                  width="1"
                  alt=""
                  style={{ display: "none" }}
                  src={`https://www.facebook.com/tr?id=${pixels.facebookPixel}&ev=PageView&noscript=1`}
                />
              </noscript>
            </>
          )}

          {/* TikTok Pixel */}
          {isValidTikTokPixelId(pixels.tiktokPixel) && (
            <Script
              id="tiktok-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function (w, d, t) {
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
                    w.ttq.load('${pixels.tiktokPixel.trim()}');
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
