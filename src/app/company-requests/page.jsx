"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Car, Users, CheckCircle2, Phone } from "lucide-react";
import { createCompanyRequest } from "@/actions/company-requests";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CompanyRequests() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        companyName: "",
        contactPerson: "",
        phone: "",
        notes: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.companyName.trim()) return;

        setIsSubmitting(true);

        try {
            // Save to database
            const result = await createCompanyRequest(formData);

            if (!result.success) {
                toast.error("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى");
                setIsSubmitting(false);
                return;
            }

            router.push("/company-requests/thank-you");
        } catch (error) {
            toast.error("حدث خطأ ما، يرجى المحاولة مرة أخرى");
            setIsSubmitting(false);
        }
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
            {/* Header Section */}
            <section className="py-12 px-6 md:px-12">
                <div className="container mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        طلبات الشركات
                    </h1>
                    <p className="text-gold text-base max-w-2xl mx-auto">
                        حلول سيارات متكاملة للشركات والمؤسسات بأسعار تنافسية وخدمات استثنائية
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-8 px-6 md:px-12">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-3xl bg-zinc-950 border border-white/5 hover:border-gold/50 transition-all duration-500 shadow-xl"
                            >
                                <div className="bg-gold text-black rounded-2xl w-14 h-14 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
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
                        <div className="w-12 h-1 bg-gold ml-4"></div>
                        <h2 className="text-3xl font-bold text-white">كيف تعمل الخدمة؟</h2>
                        <div className="w-12 h-1 bg-gold mr-4"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" dir="rtl">
                        {[
                            { step: "1", title: "أرسل طلبك", text: "قم بتعبئة النموذج مع بيانات شركتك الأساسية" },
                            { step: "2", title: "تواصل مباشر", text: "يمكنك متابعة طلبك عبر واتساب أو انتظار تواصل فريقنا" },
                            { step: "3", title: "عرض مخصص", text: "نقوم بإعداد عرض خاص يناسب احتياجاتكم" }
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-6 rounded-3xl bg-black border border-white/5">
                                <div className="w-12 h-12 rounded-2xl bg-gold text-black flex items-center justify-center font-bold text-xl mb-4">{item.step}</div>
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
                            <p className="text-gray-400 text-sm">سيتم حفظ طلبك، ويمكنك المتابعة عبر واتساب إذا رغبت</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5" dir="rtl" noValidate>
                            <div>
                                <label htmlFor="companyName" className="block mb-2 font-semibold text-white">
                                    اسم الشركة <span className="text-gold">*</span>
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
                                <label htmlFor="phone" className="block mb-2 font-semibold text-white">
                                    رقم الجوال
                                </label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="مثال: 0500000000"
                                    value={formData.phone}
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
                                className="w-full bg-gold text-black hover:bg-gold-dark font-bold py-6 text-lg rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <Phone size={22} />
                                {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
                            </Button>
                        </form>

                        <p className="text-center text-gray-500 text-xs mt-6">
                            سيتم حفظ طلبك، ويمكنك المتابعة عبر واتساب من صفحة التأكيد
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
