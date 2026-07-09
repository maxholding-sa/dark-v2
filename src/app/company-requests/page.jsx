"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Car, Users, CheckCircle2, MessageCircle } from "lucide-react";
import { getStoreInfo } from "@/actions/site-management";

export default function CompanyRequests() {
    const [formData, setFormData] = useState({
        companyName: "",
        contactPerson: "",
        notes: "",
    });

    const [storeWhatsapp, setStoreWhatsapp] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch store WhatsApp number
    useEffect(() => {
        const fetchStoreInfo = async () => {
            try {
                const result = await getStoreInfo();
                if (result.success && result.data?.whatsapp) {
                    const cleanNumber = result.data.whatsapp.replace(/[^0-9]/g, "");
                    setStoreWhatsapp(cleanNumber);
                }
            } catch (error) {
                console.error("Error fetching store info:", error);
            }
        };
        fetchStoreInfo();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.companyName.trim()) return;

        setIsSubmitting(true);

        const message = `🏢 طلب شراكة شركات جديد

📋 اسم الشركة: ${formData.companyName}
👤 اسم المسؤول: ${formData.contactPerson || "غير محدد"}
${formData.notes ? `\n📝 تفاصيل الطلب:\n${formData.notes}` : ""}

نرجو التواصل معنا لمزيد من التفاصيل حول عروض الشركات.`;

        const whatsappNumber = storeWhatsapp || "966550000000";
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, "_blank");

        // Reset form after short delay
        setTimeout(() => {
            setFormData({
                companyName: "",
                contactPerson: "",
                notes: "",
            });
            setIsSubmitting(false);
        }, 1000);
    };

    const features = [
        {
            icon: Car,
            title: "أسطول متنوع",
            description: "اختر من بين مجموعة واسعة من السيارات لتلبية احتياجات شركتك"
        },
        {
            icon: Users,
            title: "أسعار خاصة",
            description: "عروض وخصومات حصرية للشركات والمؤسسات"
        },
        {
            icon: CheckCircle2,
            title: "خدمة مميزة",
            description: "فريق متخصص لخدمة عملاء الشركات على مدار الساعة"
        }
    ];

    return (
        <div className="pt-30 min-h-screen flex flex-col bg-black">
            {/* Header Section - Matching /companies style */}
            <section className="py-12 px-6 md:px-12">
                <div className="container mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        طلبات الشركات
                    </h1>
                    <p className="text-yellow-600 text-base max-w-2xl mx-auto">
                        حلول سيارات متكاملة للشركات والمؤسسات بأسعار تنافسية وخدمات استثنائية
                    </p>
                </div>
            </section>

            {/* Features Grid - Content section matching general page structure */}
            <section className="py-8 px-6 md:px-12">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-3xl bg-zinc-950 border border-white/5 hover:border-yellow-500/50 transition-all duration-500 shadow-xl"
                            >
                                <div className="bg-yellow-500 text-black rounded-2xl w-14 h-14 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <feature.icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-12 px-6 md:px-12 bg-zinc-950">
                <div className="container mx-auto max-w-4xl">
                    <div className="flex items-center justify-center mb-10">
                        <div className="w-12 h-1 bg-yellow-500 ml-4"></div>
                        <h2 className="text-3xl font-bold text-white">كيف تعمل الخدمة؟</h2>
                        <div className="w-12 h-1 bg-yellow-500 mr-4"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" dir="rtl">
                        {[
                            { step: "1", title: "أرسل طلبك", text: "قم بتعبئة النموذج مع بيانات شركتك الأساسية" },
                            { step: "2", title: "تواصل مباشر", text: "سيتم تحويلك للواتساب للتواصل المباشر" },
                            { step: "3", title: "عرض مخصص", text: "نقوم بإعداد عرض خاص يناسب احتياجاتكم" }
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-6 rounded-3xl bg-black border border-white/5">
                                <div className="w-12 h-12 rounded-2xl bg-yellow-500 text-black flex items-center justify-center font-bold text-xl mb-4">{item.step}</div>
                                <h4 className="font-bold mb-2 text-white">{item.title}</h4>
                                <p className="text-gray-400 text-sm">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Form Section */}
            <section className="py-16 px-6 md:px-12 bg-black">
                <div className="container mx-auto max-w-xl">
                    <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2 text-white">أرسل طلبك الآن</h2>
                            <p className="text-gray-400 text-sm">سنتواصل معك خلال دقائق عبر الواتساب</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5" dir="rtl" noValidate>
                            <div>
                                <label htmlFor="companyName" className="block mb-2 font-semibold text-white">
                                    اسم الشركة <span className="text-yellow-500">*</span>
                                </label>
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    placeholder="مثال: شركة النور للتجارة"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="contactPerson" className="block mb-2 font-semibold text-white">
                                    اسم المسؤول
                                </label>
                                <Input
                                    id="contactPerson"
                                    name="contactPerson"
                                    type="text"
                                    placeholder="اسم الشخص المسؤول عن التواصل"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="notes" className="block mb-2 font-semibold text-white">
                                    تفاصيل الطلب
                                </label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    placeholder="عدد السيارات المطلوبة، نوع السيارات، أي تفاصيل أخرى..."
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="resize-none bg-black/40 border-white/10 text-white placeholder:text-gray-500"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting || !formData.companyName.trim()}
                                size="lg"
                                className="w-full bg-yellow-500 text-black hover:bg-yellow-600 font-bold py-6 text-lg rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <MessageCircle size={22} />
                                {isSubmitting ? "جاري الإرسال..." : "إرسال عبر الواتساب"}
                            </Button>
                        </form>

                        <p className="text-center text-gray-500 text-xs mt-6">
                            بالضغط على الزر سيتم فتح نافذة واتساب جديدة مع بيانات طلبك
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
