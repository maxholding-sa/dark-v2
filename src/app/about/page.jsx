"use client";
import { Button } from "@/components/ui/button";
import { Users, Target, Award, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SignedOut } from "@clerk/nextjs";
import ChatBot from "@/components/ChatBot";
import { useEffect, useRef } from "react";

export default function About() {
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

  return (
    <div className="pt-20 flex flex-col bg-black">
      {/* Hero / من نحن */}
      <section ref={addToRefs} className="py-24 px-6 md:px-12 bg-black scroll-animate">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 text-white">من نحن</h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              <span className="text-yellow-500 font-bold">ماكس موتورز</span> هي المنصة الرائدة في المنطقة للبحث عن السيارات باستخدام تقنية الذكاء الاصطناعي. نحن نجمع بين الخبرة العريقة في سوق السيارات والتكنولوجيا المتطورة لنوفر لعملائنا تجربة شراء فريدة، شفافة، وآمنة تماماً.
            </p>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section ref={addToRefs} className="py-20 px-6 md:px-12 bg-zinc-950 scroll-animate">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="flex items-center mb-6">
                <div className="w-12 h-1 bg-yellow-500 ml-4"></div>
                <h2 className="text-4xl font-bold text-white">رؤيتنا</h2>
              </div>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                رؤيتنا هي أن نصبح الوجهة الأولى والموثوقة في المنطقة لكل من يرغب في شراء أو بيع سيارة، من خلال بناء منظومة رقمية تعتمد على البيانات والذكاء الاصطناعي لتبسيط اتخاذ القرار.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                نسعى دائماً للابتكار وتحويل عملية امتلاك السيارة من مهمة شاقة إلى تجربة ممتعة ومضمونة النتائج.
              </p>
            </div>
            <div className="relative h-[400px] order-1 md:order-2">
              <div className="absolute inset-0 bg-yellow-500/10 rounded-3xl blur-3xl -z-10"></div>
              <Image
                src="/about-saudi-vision.jpg"
                alt="أفق الرياض مع برج المملكة - السعودية"
                fill
                style={{ objectFit: "cover" }}
                className="rounded-3xl shadow-2xl border border-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section ref={addToRefs} className="py-20 px-6 md:px-12 bg-black scroll-animate">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative h-[400px]">
              <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-3xl -z-10"></div>
              <Image
                src="/about-saudi-mission.jpg"
                alt="الحِجر (مدائن صالح) في العلا - السعودية"
                fill
                style={{ objectFit: "cover" }}
                className="rounded-3xl shadow-2xl border border-white/10"
              />
            </div>
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-1 bg-yellow-500 ml-4"></div>
                <h2 className="text-4xl font-bold text-white">رسالتنا</h2>
              </div>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                تكمن رسالتنا في تمكين المستخدم من الوصول إلى "السيارة المثالية" من خلال توفير أدوات بحث ذكية، تقارير شفافة، وفريق دعم محترف يرافق العميل في كافة اشتراطات الفحص والتمويل.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                الالتزام بالجودة والدقة هو جوهر خدماتنا، لأن ثقة العملاء هي رأس مالنا الحقيقي.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Cards */}
      <section ref={addToRefs} className="py-24 px-6 md:px-12 bg-zinc-950 scroll-animate">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">
            لماذا يختار العملاء <span className="text-yellow-500">ماكس موتورز</span>؟
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Target, title: "دقة في البحث", text: "استخدام خوارزميات الذكاء الاصطناعي لفرز آلاف السيارات واقتراح الأنسب لك." },
              { icon: Users, title: "فريق متخصص", text: "خبراء فنيين ومستشارين ماليين متاحين لمساعدتك في اتخاذ القرار الصحيح." },
              { icon: Award, title: "جودة مضمونة", text: "نتعامل فقط مع وكالات معتمدة وبائعين وموثقين لضمان سلامة سيارتك." },
              { icon: Heart, title: "رضا العملاء", text: "أكثر من 10,000 عميل سعيد وجدوا سيارات أحلامهم عبر منصتنا." }
            ].map((item, idx) => (
              <div key={idx} className="group p-8 rounded-3xl bg-black border border-white/5 hover:border-yellow-500/50 transition-all duration-500 shadow-xl hover:-translate-y-2">
                <div className="bg-yellow-500 text-black rounded-2xl w-14 h-14 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={addToRefs} className="py-24 px-6 md:px-12 relative overflow-hidden scroll-animate">
        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-transparent to-transparent -z-10"></div>
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            هل أنت مستعد للعثور على سيارتك؟
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            انضم إلى آلاف المستخدمين الذين يثقون في ماكس موتورز للوصول إلى أفضل العروض المتاحة.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold px-10 h-14 rounded-full" asChild>
              <Link href="/cars">تصفح السيارات الآن</Link>
            </Button>
            <SignedOut>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 px-10 h-14 rounded-full" asChild>
                <Link href="/sign-up">إنشاء حساب جديد</Link>
              </Button>
            </SignedOut>
          </div>
        </div>
      </section>

      <ChatBot />
    </div>
  );
}
