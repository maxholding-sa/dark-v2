import { ChevronLeft, ChevronDown, Car, Calendar, Shield, Banknote } from "lucide-react";
import Image from "next/image";
import { getCommercialCars, getEconomicCars, getLuxuryCars, getOfferCars } from "@/actions/home";
import { getFeaturedBrands } from "@/actions/featured-brands";
import { getFeaturedModels } from "@/actions/featured-models";
import { getBanks } from "@/actions/banks";
import { getWhatsAppNumber, getHeroSection, getLogoByType } from "@/actions/site-management";
import { getHomeReviews } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { faqItems } from "@/lib/data";

import LinkWithLoader from "@/components/LinkWithLoader";
import HomeSearch from "@/components/HomeSearch";
import FeaturedCarsCarousel from "@/components/FeaturedCarsCarousel";
import FeaturedBrandCard from "@/components/FeaturedBrandCard";
import FeaturedModelCard from "@/components/FeaturedModelCard";
import BankCard from "@/components/BankCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import ScrollAnimate from "@/components/ScrollAnimate";
import SectionBackgroundVideo from "@/components/SectionBackgroundVideo";
import HeroVideo from "@/components/HeroVideo";
import SbcVerifySeal from "@/components/SbcVerifySeal";
import { generateJsonLd, generateMetadata } from "@/lib/seo";
import { logger } from "@/lib/logger";

export const metadata = generateMetadata({
  title: "ماكس موتورز | سيارات للبيع وتمويل في السعودية",
  description: "تصفح سيارات ماكس موتورز الجديدة والمستعملة في السعودية، قارن العروض، احجز تجربة قيادة، واطلب التمويل المناسب لسيارتك.",
  keywords: ["maxmotors", "ماكس موترز", "ماكس موتورز", "سيارات للبيع", "سيارات مستعملة", "سيارات جديدة", "تجربة قيادة"],
  canonicalUrl: "/",
});

async function homeSafe(promiseFn, fallback) {
  try {
    return await promiseFn();
  } catch (e) {
    logger.error("[home] fetch failed", e);
    return fallback;
  }
}

function HomeCarsSection({ title, cars, href = "/cars" }) {
  if (!cars?.length) return null;

  return (
    <section className="py-20 relative w-full">
      <SectionBackgroundVideo
        src="/featured.mp4"
        mobileSrc="/featured-mobile.mp4"
        poster="/featured-poster.jpg"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-5"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-5"></div>
      <div className="relative z-10 w-full">
        <ScrollAnimate className="flex justify-between items-center mb-8 px-6 md:px-12">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <LinkWithLoader href={href}>
            <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
          </LinkWithLoader>
        </ScrollAnimate>
        <FeaturedCarsCarousel cars={cars} />
      </div>
    </section>
  );
}

export default async function Home() {
  // Parallel data fetching on the server (errors must not be cached as empty — see actions/banks etc.)
  const [
    offerCarsRes,
    luxuryCarsRes,
    economyCarsRes,
    commercialCarsRes,
    featuredBrandsRes,
    featuredModelsRes,
    banksRes,
    heroSectionRes,
    whatsappNumberRes,
    mainLogoRes,
    reviewsRes
  ] = await Promise.all([
    homeSafe(() => getOfferCars(8), { data: [] }),
    homeSafe(() => getLuxuryCars(8), { data: [] }),
    homeSafe(() => getEconomicCars(8), { data: [] }),
    homeSafe(() => getCommercialCars(8), { data: [] }),
    homeSafe(() => getFeaturedBrands(), { data: [] }),
    homeSafe(() => getFeaturedModels(), { data: [] }),
    homeSafe(() => getBanks(), { data: [] }),
    homeSafe(() => getHeroSection(), { data: null }),
    homeSafe(() => getWhatsAppNumber(), { data: null }),
    homeSafe(() => getLogoByType("main"), { data: null }),
    homeSafe(() => getHomeReviews(3), [])
  ]);

  const offerCars = offerCarsRes?.data || [];
  const luxuryCars = luxuryCarsRes?.data || [];
  const economyCars = economyCarsRes?.data || [];
  const commercialCars = commercialCarsRes?.data || [];
  const featuredBrands = featuredBrandsRes?.data || [];
  const featuredModels = featuredModelsRes?.data || [];
  const banks = banksRes?.data || [];
  logger.debug("[home] banks fetched", { count: banks.length });
  const heroSection = heroSectionRes?.data || {
    videoUrl: "/hero1.mp4",
    title: "مرحباً بك",
    subtitle: "بحث ذكي عن السيارات واختبار القيادة من بين مئات المركبات.",
    isActive: true,
  };
  const whatsappNumber = whatsappNumberRes?.data;
  const whatsappEnabled = whatsappNumberRes?.whatsappEnabled ?? true;
  const whatsappLabel = whatsappNumberRes?.whatsappLabel || "";
  const whatsappText = whatsappNumberRes?.whatsappText || "";
  const mainLogo = mainLogoRes?.data;
  const reviews = reviewsRes || [];

  const heroVideoSrc = heroSection.videoUrl || "/hero1.mp4";
  const heroIsLocal = heroVideoSrc.startsWith("/");

  return (
    <>
      <script
        id="maxmotors-local-business-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateJsonLd("localBusiness")),
        }}
      />
      <link
        rel="preload"
        as="image"
        href={heroSection.posterImage || (heroIsLocal ? "/hero1-poster.jpg" : heroVideoSrc)}
        fetchPriority="high"
      />
      {heroIsLocal && (
        <>
          <link rel="preload" as="video" href="/hero1-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
          <link rel="preload" as="video" href={heroVideoSrc} type="video/mp4" media="(min-width: 769px)" />
        </>
      )}
      {!heroIsLocal && (
        <link rel="preload" as="video" href={heroVideoSrc} type="video/mp4" fetchPriority="high" />
      )}
      <link rel="preload" as="image" href="/featured-poster.jpg" />
    <div className="pt-20 flex flex-col bg-black overflow-x-hidden">
      {/* Hero */}
      <section
        className="relative min-h-[calc(100svh-5rem)] pt-32 pb-48 md:pt-24 md:pb-48 lg:pt-32 lg:pb-60 overflow-x-hidden"
        style={{
          backgroundImage: `url(${heroSection.posterImage || "/hero1-poster.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <HeroVideo
          src={heroVideoSrc}
          mobileSrc={heroIsLocal ? "/hero1-mobile.mp4" : undefined}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute bottom-0 left-0 w-full h-48 gradient-fade-to-black z-[5] pointer-events-none"></div>
        <div className="relative z-20 max-w-4xl mx-auto text-center px-4">
          <div className="mb-24 mt-8">
            {heroSection.title && (
              <h1 className="text-5xl md:text-6xl lg:text-7xl mb-4 text-white font-bold leading-tight animate-fade-in-up">
                {heroSection.title}
              </h1>
            )}
            {heroSection.subtitle && (
              <p className="text-xl text-white mb-4 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
                {heroSection.subtitle}
              </p>
            )}
          </div>
          <div className="relative z-30 overflow-visible md:animate-none animate-fade-in-up animation-delay-400">
            <HomeSearch />
          </div>
          <div className="mt-6 animate-fade-in-up animation-delay-400">
            <LinkWithLoader href="/loan-request">
              <Button
                size="lg"
                className="bg-gold-dark hover:bg-gold-dark text-white font-bold px-8 gap-2"
              >
                <Banknote className="h-5 w-5" />
                طلب قرض مباشرة
              </Button>
            </LinkWithLoader>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 md:py-20 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-blue-500/5 rounded-3xl -z-10"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:[direction:ltr] items-center gap-8 md:gap-16">
            {/* Logo — top on mobile, LEFT on desktop */}
            <ScrollAnimate variant="left" className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-[220px] sm:w-[280px] md:w-full md:max-w-lg group">
                <div className="relative rounded-3xl overflow-hidden aspect-square flex items-center justify-center">
                  <Image
                    src={mainLogo?.imageUrl || "/logo.jpg"}
                    alt={mainLogo?.altText || "About maxmotors"}
                    width={500}
                    height={500}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </div>
              </div>
            </ScrollAnimate>
            {/* Text — below logo on mobile, RIGHT on desktop */}
            <ScrollAnimate variant="right" className="w-full md:w-1/2">
              <div dir="rtl" className="flex flex-col items-center text-center md:items-end md:text-right space-y-4 md:space-y-6">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">عن ماكس موتورز</h2>
                <div className="space-y-3 md:space-y-4 text-white/90 text-base md:text-lg leading-relaxed">
                  <p>نحن منصة رائدة في مجال البحث عن السيارات وحجز اختبارات القيادة في المنطقة. نوفر لك تجربة سلسة وآمنة للعثور على سيارة أحلامك من بين مئات الخيارات المتاحة.</p>
                  <p>مع تقنيات الذكاء الاصطناعي المتقدمة، نساعدك على اتخاذ القرار الصحيح من خلال توفير معلومات دقيقة ومقارنات شاملة بين المركبات المختلفة.</p>
                </div>
                <div className="pt-2 md:pt-4">
                  <LinkWithLoader href="/about">
                    <Button size="lg" className="bg-gradient-to-r from-gold to-gold hover:from-gold hover:to-gold-dark text-black font-bold px-8 py-4 rounded-full shadow-2xl hover:shadow-gold/25 transform hover:scale-105 transition-all duration-300 border-2 border-gold-light/50">
                      اعرف المزيد
                    </Button>
                  </LinkWithLoader>
                </div>
              </div>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      <HomeCarsSection title="عروض مميزة" cars={offerCars} />
      <HomeCarsSection title="سيارات فاخرة" cars={luxuryCars} />
      <HomeCarsSection title="سيارات اقتصادية" cars={economyCars} href="/cars?isEconomic=true" />
      <HomeCarsSection title="سيارات تجارية" cars={commercialCars} href="/cars?isCommercial=true" />

      {/* Banks Section — avoid ScrollAnimate here so tiles are not stuck at opacity:0 if animation never runs */}
      <section className="py-20 px-6 md:px-12 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-white">البنوك الشريكة</h2>
            <LinkWithLoader href="/banks">
              <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
            </LinkWithLoader>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {banks.slice(0, 6).map((bank, index) => (
              <div
                key={bank.id}
                className={index >= 4 ? "hidden lg:block" : undefined}
              >
                <BankCard bank={bank} compact />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by brands */}
      <section className="py-20 px-6 md:px-12 relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <ScrollAnimate className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-white">الشركات المميزة</h2>
            <LinkWithLoader href="/companies">
              <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
            </LinkWithLoader>
          </ScrollAnimate>
          <ScrollAnimate stagger className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {featuredBrands.slice(0, 8).map((brand, index) => (
              <div
                key={brand.id}
                className={index >= 6 ? "hidden md:block lg:hidden" : undefined}
              >
                <FeaturedBrandCard brand={brand} />
              </div>
            ))}
          </ScrollAnimate>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-20 px-6 md:px-12 relative min-h-[600px] flex items-center">
        <SectionBackgroundVideo
          src="/sectionBG4.mp4"
          mobileSrc="/sectionBG4-mobile.mp4"
          poster="/sectionBG4-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 bg-black/60 z-5"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto">
            <ScrollAnimate variant="up">
              <h2 className="text-4xl font-bold text-center mb-16 text-white">لماذا تختار منصتنا</h2>
            </ScrollAnimate>
            <ScrollAnimate stagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <Car className="h-8 w-8" />, title: "تشكيلة واسعة", text: "آلاف المركبات الموثقة من وكالات معتمدة وبائعين خاصين." },
                { icon: <Calendar className="h-8 w-8" />, title: "اختبار قيادة سهل", text: "احجز اختبار القيادة عبر الإنترنت في دقائق، مع خيارات جدولة مرنة." },
                { icon: <Shield className="h-8 w-8" />, title: "عملية آمنة", text: "قوائم موثقة وعملية حجز آمنة لراحة بالك." }
              ].map((item, idx) => (
                <div key={idx} className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:border-gold/50 transition-all duration-500">
                  <div className="bg-gold text-black rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{item.title}</h3>
                  <p className="text-white/80">{item.text}</p>
                </div>
              ))}
            </ScrollAnimate>
          </div>
        </div>
      </section>

      {/* Browse by model */}
      <section className="py-20 px-6 md:px-12">
        <div className="container mx-auto">
          <ScrollAnimate className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-white">الموديلات المميزة</h2>
            <LinkWithLoader href="/featured-models">
              <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
            </LinkWithLoader>
          </ScrollAnimate>
          <ScrollAnimate stagger className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredModels.map((model) => (
              <FeaturedModelCard key={model.id} model={model} />
            ))}
          </ScrollAnimate>
        </div>
      </section>

      {/* FAQs + CTA — shared background video */}
      <div className="relative overflow-hidden" data-section-video-root>
        <div className="absolute inset-x-0 top-0 z-0 pointer-events-none">
          <SectionBackgroundVideo
            src="/sectionBG5.mp4"
            mobileSrc="/sectionBG5-mobile.mp4"
            poster="/sectionBG5-poster.jpg"
            className="w-full h-auto block"
          />
        </div>

        {/* FAQs */}
        <section className="relative z-10 py-20 px-6 md:px-40 text-white">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-zinc-950/70 to-zinc-950/85 pointer-events-none"></div>
          <div className="container mx-auto text-right relative z-10">
            <ScrollAnimate variant="up">
              <h2 className="text-3xl font-bold mb-12 text-white">الأسئلة الشائعة</h2>
            </ScrollAnimate>
            <ScrollAnimate>
              <div className="w-full" dir="rtl">
                {faqItems.map((faq, index) => (
                  <details
                    key={index}
                    className="group border-b border-white/10 last:border-b-0"
                  >
                    <summary className="flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-right text-lg font-medium transition-colors outline-none hover:text-gold cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="flex-1">{faq.question}</span>
                      <ChevronDown className="text-white/60 pointer-events-none size-4 shrink-0 translate-y-1 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="text-white/70 text-base pb-4">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </ScrollAnimate>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 py-20 md:py-40 px-6 min-h-[480px] flex items-center">
          <div className="absolute inset-0 bg-black/70 pointer-events-none"></div>
          <div className="container mx-auto relative z-10 text-center max-w-2xl">
            <ScrollAnimate>
              <h2 className="text-5xl font-bold mb-8 text-white">ابدأ رحلتك اليوم</h2>
              <p className="text-xl text-white/80 mb-12">انضم إلى آلاف المستخدمين الذين وجدوا سيارة أحلامهم عبر منصتنا.</p>
              <LinkWithLoader href="/cars">
                <Button size="lg" className="bg-gold text-black hover:bg-gold font-bold px-12 py-8 rounded-full text-xl shadow-2xl">
                  تصفح السيارات الآن
                </Button>
              </LinkWithLoader>
            </ScrollAnimate>
          </div>
        </section>
      </div>

      {/* Home page only — no WhatsApp launcher on /cars or anywhere else */}
      <WhatsAppButton phoneNumber={whatsappNumber} enabled={whatsappEnabled} label={whatsappLabel} text={whatsappText} />

      {/* Verified-store seal: home page only, not site-wide */}
      <SbcVerifySeal />
    </div>
    </>
  );
}
