"use client";

import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  Award,
  Heart,
  Sparkles,
  Shield,
  Star,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SignedOut } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const ICON_MAP = {
  Target,
  Users,
  Award,
  Heart,
  Sparkles,
  Shield,
  Star,
  Zap,
};

function cleanText(value = "") {
  return String(value)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function SectionImage({ src, alt, fallback, glowClass = "bg-yellow-500/10" }) {
  const imageSrc = src || fallback;
  if (!imageSrc) return null;

  return (
    <div className="relative h-[400px]">
      <div className={`absolute inset-0 ${glowClass} rounded-3xl blur-3xl -z-10`} />
      <Image
        src={imageSrc}
        alt={alt || ""}
        fill
        style={{ objectFit: "cover" }}
        className="rounded-3xl shadow-2xl border border-white/10"
      />
    </div>
  );
}

function SectionHeading({ title }) {
  return (
    <div className="flex items-center justify-end mb-6">
      <h2 className="text-4xl font-bold text-white">{title}</h2>
      <div className="w-12 h-1 bg-yellow-500 mr-4" />
    </div>
  );
}

export default function AboutPageContent({ page }) {
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  const features = page.features || [];

  return (
    <div className="pt-20 flex flex-col bg-black" dir="rtl">
      {/* Hero */}
      <section ref={addToRefs} className="py-24 px-6 md:px-12 bg-black scroll-animate">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 text-white">{page.title}</h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed whitespace-pre-line">
              {cleanText(page.introText)}
            </p>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section ref={addToRefs} className="py-20 px-6 md:px-12 bg-zinc-950 scroll-animate">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 text-right">
              <SectionHeading title={page.visionTitle} />
              <p className="text-gray-400 text-lg mb-6 leading-relaxed whitespace-pre-line">
                {cleanText(page.visionParagraph1)}
              </p>
              <p className="text-gray-400 text-lg leading-relaxed whitespace-pre-line">
                {cleanText(page.visionParagraph2)}
              </p>
            </div>
            <div className="order-1 md:order-2">
              <SectionImage
                src={page.visionImage}
                alt={page.visionImageAlt}
                fallback="/about-saudi-vision.jpg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section ref={addToRefs} className="py-20 px-6 md:px-12 bg-black scroll-animate">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <SectionImage
                src={page.missionImage}
                alt={page.missionImageAlt}
                fallback="/about-saudi-mission.jpg"
                glowClass="bg-blue-500/10"
              />
            </div>
            <div className="order-1 md:order-2 text-right">
              <SectionHeading title={page.missionTitle} />
              <p className="text-gray-400 text-lg mb-6 leading-relaxed whitespace-pre-line">
                {cleanText(page.missionParagraph1)}
              </p>
              <p className="text-gray-400 text-lg leading-relaxed whitespace-pre-line">
                {cleanText(page.missionParagraph2)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      {features.length > 0 && (
        <section ref={addToRefs} className="py-24 px-6 md:px-12 bg-zinc-950 scroll-animate">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 text-white">{page.whyUsTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature) => {
                const Icon = ICON_MAP[feature.icon] || Target;
                return (
                  <div
                    key={feature.id}
                    className="group p-8 rounded-3xl bg-black border border-white/5 hover:border-yellow-500/50 transition-all duration-500 shadow-xl hover:-translate-y-2 text-right"
                  >
                    <div className="bg-yellow-500 text-black rounded-2xl w-14 h-14 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                      {cleanText(feature.description)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section ref={addToRefs} className="py-24 px-6 md:px-12 relative overflow-hidden scroll-animate">
        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-transparent to-transparent -z-10" />
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">{page.ctaTitle}</h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto whitespace-pre-line">
            {cleanText(page.ctaText)}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Button
              size="lg"
              className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold px-10 h-14 rounded-full"
              asChild
            >
              <Link href="/cars">تصفح السيارات الآن</Link>
            </Button>
            <SignedOut>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 px-10 h-14 rounded-full"
                asChild
              >
                <Link href="/sign-up">إنشاء حساب جديد</Link>
              </Button>
            </SignedOut>
          </div>
        </div>
      </section>
    </div>
  );
}
