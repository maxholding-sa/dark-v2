import { ChevronLeft, Car, Calendar, Shield } from "lucide-react";
import Image from "next/image";
import { getFeaturedCars } from "@/actions/home";
import { getFeaturedBrands } from "@/actions/featured-brands";
import { getFeaturedModels } from "@/actions/featured-models";
import { getBanks } from "@/actions/banks";
import { getWhatsAppNumber, getHeroSection, getLogoByType } from "@/actions/site-management";
import { getHomeReviews } from "@/actions/reviews";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqItems } from "@/lib/data";

import LinkWithLoader from "@/components/LinkWithLoader";
import HomeSearch from "@/components/HomeSearch";
import CarCard from "@/components/CarCard";
import FeaturedBrandCard from "@/components/FeaturedBrandCard";
import FeaturedModelCard from "@/components/FeaturedModelCard";
import BankCard from "@/components/BankCard";
import ChatBot from "@/components/ChatBot";
import WhatsAppButton from "@/components/WhatsAppButton";
import LetterByLetterText from "@/components/LetterByLetterText";
import ScrollAnimate from "@/components/ScrollAnimate";
import VideoPlayer from "@/components/VideoPlayer";

async function homeSafe(promiseFn, fallback) {
  try {
    return await promiseFn();
  } catch (e) {
    console.error("[home] fetch failed:", e?.message || e);
    return fallback;
  }
}

export default async function Home() {
  // Parallel data fetching on the server (errors must not be cached as empty — see actions/banks etc.)
  const [
    featuredCarsRes,
    featuredBrandsRes,
    featuredModelsRes,
    banksRes,
    heroSectionRes,
    whatsappNumberRes,
    mainLogoRes,
    reviewsRes
  ] = await Promise.all([
    homeSafe(() => getFeaturedCars(), { data: [] }),
    homeSafe(() => getFeaturedBrands(), { data: [] }),
    homeSafe(() => getFeaturedModels(), { data: [] }),
    homeSafe(() => getBanks(), { data: [] }),
    homeSafe(() => getHeroSection(), { data: null }),
    homeSafe(() => getWhatsAppNumber(), { data: null }),
    homeSafe(() => getLogoByType("main"), { data: null }),
    homeSafe(() => getHomeReviews(3), [])
  ]);

  const featuredCars = featuredCarsRes?.data || [];
  const featuredBrands = featuredBrandsRes?.data || [];
  const featuredModels = featuredModelsRes?.data || [];
  const banks = banksRes?.data || [];
  const heroSection = heroSectionRes?.data || {
    videoUrl: "/hero1.mp4",
    title: "مرحباً بك",
    subtitle: "بحث ذكي عن السيارات واختبار القيادة من بين مئات المركبات.",
    isActive: true,
  };
  const whatsappNumber = whatsappNumberRes?.data;
  const mainLogo = mainLogoRes?.data;
  const reviews = reviewsRes || [];

  return (
    <div className="pt-20 flex flex-col bg-black overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-32 pb-48 md:pt-24 md:pb-48 lg:pt-32 lg:pb-60">
        <VideoPlayer
          src={heroSection.videoUrl || "/hero1.mp4"}
          poster={heroSection.posterImage}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute bottom-0 left-0 w-full h-48 gradient-fade-to-black z-20 pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
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
          <div className="md:animate-none animate-fade-in-up animation-delay-400">
            <HomeSearch />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-blue-500/5 rounded-3xl -z-10"></div>
        <div className="container mx-auto relative z-10">
          <ScrollAnimate className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="text-right space-y-6 order-2 md:order-1">
              <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">عن ماكس موتورز</h2>
              <div className="space-y-4 text-white/90 text-lg leading-relaxed">
                <p>نحن منصة رائدة في مجال البحث عن السيارات وحجز اختبارات القيادة في المنطقة. نوفر لك تجربة سلسة وآمنة للعثور على سيارة أحلامك من بين مئات الخيارات المتاحة.</p>
                <p>مع تقنيات الذكاء الاصطناعي المتقدمة، نساعدك على اتخاذ القرار الصحيح من خلال توفير معلومات دقيقة ومقارنات شاملة بين المركبات المختلفة.</p>
              </div>
              <div className="pt-4">
                <LinkWithLoader href="/about">
                  <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8 py-4 rounded-full shadow-2xl hover:shadow-yellow-500/25 transform hover:scale-105 transition-all duration-300 border-2 border-yellow-400/50">
                    اعرف المزيد
                  </Button>
                </LinkWithLoader>
              </div>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="relative w-full max-w-lg mx-auto group">
                <div className="relative rounded-3xl overflow-hidden aspect-square flex items-center justify-center">
                  <Image
                    src={mainLogo?.imageUrl || "/logo.JPG"}
                    alt={mainLogo?.altText || "About maxmotors"}
                    width={500}
                    height={500}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* Featured Cars */}
      <section className="py-20 px-6 md:px-12 relative">
        <VideoPlayer
          src="/featured.mp4"
          mobileSrc="/featured-mobile.mp4"
          className="absolute inset-0 w-full h-full object-cover z-0"
          playOnScroll={true}
        />
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-5"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-5"></div>
        <div className="container mx-auto relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">السيارات المميزة</h2>
            <LinkWithLoader href="/cars">
              <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
            </LinkWithLoader>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {featuredCars.map((car) => (
              <CarCard key={car.id} car={car} isFeatured={true} />
            ))}
          </div>
        </div>
      </section>

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
                <BankCard bank={bank} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by brands */}
      <section className="py-20 px-6 md:px-12 relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-white">الشركات المميزة</h2>
            <LinkWithLoader href="/companies">
              <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
            </LinkWithLoader>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {featuredBrands.slice(0, 8).map((brand, index) => (
              <div
                key={brand.id}
                className={index >= 6 ? "hidden md:block lg:hidden" : undefined}
              >
                <FeaturedBrandCard brand={brand} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-20 px-6 md:px-12 relative min-h-[600px] flex items-center">
        <VideoPlayer
          src="/sectionBG4.mp4"
          className="absolute inset-0 w-full h-full object-cover z-0"
          playOnScroll={true}
        />
        <div className="absolute inset-0 bg-black/60 z-5"></div>
        <div className="container mx-auto relative z-10">
          <ScrollAnimate className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 text-white">لماذا تختار منصتنا</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <Car className="h-8 w-8" />, title: "تشكيلة واسعة", text: "آلاف المركبات الموثقة من وكالات معتمدة وبائعين خاصين." },
                { icon: <Calendar className="h-8 w-8" />, title: "اختبار قيادة سهل", text: "احجز اختبار القيادة عبر الإنترنت في دقائق، مع خيارات جدولة مرنة." },
                { icon: <Shield className="h-8 w-8" />, title: "عملية آمنة", text: "قوائم موثقة وعملية حجز آمنة لراحة بالك." }
              ].map((item, idx) => (
                <div key={idx} className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:border-yellow-500/50 transition-all duration-500">
                  <div className="bg-yellow-500 text-black rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{item.title}</h3>
                  <p className="text-white/80">{item.text}</p>
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* Browse by model */}
      <section className="py-20 px-6 md:px-12">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-white">الموديلات المميزة</h2>
            <LinkWithLoader href="/featured-models">
              <Button variant="ghost" className="text-white">عرض الكل <ChevronLeft className="mr-1 h-4 w-4" /></Button>
            </LinkWithLoader>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredModels.map((model) => (
              <FeaturedModelCard key={model.id} model={model} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 px-6 md:px-40 bg-zinc-950 text-white">
        <div className="container mx-auto text-right">
          <h2 className="text-3xl font-bold mb-12">الأسئلة الشائعة</h2>
          <ScrollAnimate>
            <Accordion type="single" collapsible className="w-full" dir="rtl">
              {faqItems.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger 
                    id={`faq-trigger-${index}`} 
                    aria-controls={`faq-content-${index}`}
                    className="text-lg hover:text-yellow-500 transition-colors"
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent 
                    id={`faq-content-${index}`}
                    className="text-white/70 text-base"
                  >
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollAnimate>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 relative overflow-hidden">
        <VideoPlayer
          src="/sectionBG5.mp4"
          mobileSrc="/sectionBG5-mobile.mp4"
          className="absolute inset-0 w-full h-full object-cover z-0"
          playOnScroll={true}
        />
        <div className="absolute inset-0 bg-black/70 z-5"></div>
        <div className="container mx-auto relative z-10 text-center max-w-2xl">
          <ScrollAnimate>
            <h2 className="text-5xl font-bold mb-8 text-white">ابدأ رحلتك اليوم</h2>
            <p className="text-xl text-white/80 mb-12">انضم إلى آلاف المستخدمين الذين وجدوا سيارة أحلامهم عبر منصتنا.</p>
            <LinkWithLoader href="/cars">
              <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold px-12 py-8 rounded-full text-xl shadow-2xl">
                تصفح السيارات الآن
              </Button>
            </LinkWithLoader>
          </ScrollAnimate>
        </div>
      </section>

      <ChatBot />
      <WhatsAppButton phoneNumber={whatsappNumber} />
    </div>
  );
}
