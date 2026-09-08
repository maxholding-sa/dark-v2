import Link from "next/link";
import { CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { getWhatsAppNumber } from "@/actions/site-management";

export const metadata = {
    title: "شكراً لك | ماكس موتورز",
    description: "تم استلام طلبك بنجاح، سنتواصل معك قريباً",
};

const DEFAULT_WHATSAPP = "966550000000";
const WHATSAPP_MESSAGE = "السلام عليكم، قدمت طلب شراكة شركات وأريد المتابعة عبر الواتساب.";

export default async function ThankYouPage() {
    const whatsappResult = await getWhatsAppNumber();
    const rawNumber = whatsappResult?.success && whatsappResult.data
        ? String(whatsappResult.data)
        : DEFAULT_WHATSAPP;
    const whatsappNumber = rawNumber.replace(/[^0-9]/g, "") || DEFAULT_WHATSAPP;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 pt-30 pb-12">
            <div className="max-w-lg w-full text-center">
                {/* Animated Check Icon */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-gold/10 flex items-center justify-center animate-pulse">
                            <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center">
                                <CheckCircle2 className="w-12 h-12 text-gold" strokeWidth={1.5} />
                            </div>
                        </div>
                        {/* Decorative ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-gold/30 scale-125 opacity-60" />
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        شكراً لك!
                    </h1>

                    <div className="w-16 h-1 bg-gold mx-auto mb-6 rounded-full" />

                    <p className="text-gray-300 text-lg mb-3 leading-relaxed">
                        تم استلام طلب شركتك بنجاح
                    </p>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        سيتواصل معك فريقنا المتخصص في أقرب وقت ممكن لتقديم عرض مخصص يلبي احتياجات شركتك
                    </p>

                    {/* Info boxes */}
                    <div className="grid grid-cols-1 gap-3 mb-8">
                        <div className="flex items-center gap-3 bg-black/60 rounded-2xl p-4 text-right" dir="rtl">
                            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                                <Phone className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">تواصل مباشر</p>
                                <p className="text-gray-400 text-xs">سيتم التواصل معك عبر الواتساب أو الاتصال المباشر</p>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp continue */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold px-6 py-3.5 rounded-full hover:bg-[#20bd5a] transition-all duration-300 text-sm shadow-[0_8px_24px_rgba(37,211,102,0.28)] mb-3"
                    >
                        <FaWhatsapp className="w-5 h-5" />
                        متابعة الطلب عبر واتساب
                    </a>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 bg-gold text-black font-bold px-6 py-3 rounded-full hover:bg-gold/90 transition-all duration-300 text-sm"
                        >
                            العودة للرئيسية
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/company-requests"
                            className="inline-flex items-center justify-center gap-2 border border-white/10 text-gray-300 font-medium px-6 py-3 rounded-full hover:border-gold/50 hover:text-white transition-all duration-300 text-sm"
                        >
                            إرسال طلب آخر
                        </Link>
                    </div>
                </div>

                {/* Bottom decorative text */}
                <p className="text-gray-600 text-xs mt-6">
                    ماكس موتورز — شريكك الموثوق لأساطيل الشركات
                </p>
            </div>
        </div>
    );
}
