"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { getStoreInfo } from "@/actions/site-management";
import React, { useEffect, useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
    async function fetchStoreInfo() {
      const result = await getStoreInfo();
      if (result.success) {
        setStoreInfo(result.data);
      }
    }
    fetchStoreInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <div className="pt-20 flex flex-col bg-black min-h-screen text-white">
      <section className="py-16 px-6 md:px-12 container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl font-bold mb-6 text-right">أرسل لنا رسالة</h2>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6" dir="rtl" noValidate>
                <div>
                  <label htmlFor="name" className="block mb-2 font-semibold">
                    الاسم الكامل
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block mb-2 font-semibold">
                    البريد الإلكتروني
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block mb-2 font-semibold">
                    الموضوع
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    placeholder="موضوع الرسالة"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block mb-2 font-semibold">
                    الرسالة
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    placeholder="اكتب رسالتك هنا"
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="flex justify-start">
                  <Button type="submit" size="lg" className="px-12">
                    إرسال
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center bg-green-900/20 p-8 rounded-lg border border-green-500/50 text-green-400 text-xl font-semibold">
                تم إرسال رسالتك بنجاح! شكراً لتواصلك معنا.
              </div>
            )}
          </div>

          {/* Contact Info & Map */}
          <div className="order-1 lg:order-2 space-y-8" dir="rtl">
            <div>
              <h2 className="text-2xl font-bold mb-6">معلومات التواصل</h2>
              <div className="space-y-4">
                {storeInfo?.address && (
                  <div className="flex items-center gap-4">
                    <div className="bg-gold p-3 rounded-full">
                      <MapPin size={24} className="text-black" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">موقعنا</p>
                      <p className="text-gray-300">
                        {storeInfo?.address ? `${storeInfo.address}, ${storeInfo.city || ''}` : "الرسي للأشجار الصناعية، الرياض"}
                      </p>
                    </div>
                  </div>
                )}

                {storeInfo?.phone && (
                  <div className="flex items-center gap-4">
                    <div className="bg-gold p-3 rounded-full">
                      <Phone size={24} className="text-black" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">اتصل بنا</p>
                      <a href={`tel:${storeInfo.phone}`} className="text-gray-300 hover:text-gold transition-colors">
                        {storeInfo.phone}
                      </a>
                    </div>
                  </div>
                )}

                {storeInfo?.whatsapp && (
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500 p-3 rounded-full">
                      <SiWhatsapp size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">واتساب</p>
                      <a href={`https://wa.me/${storeInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-500 transition-colors">
                        {storeInfo.whatsapp}
                      </a>
                    </div>
                  </div>
                )}

                {storeInfo?.email && (
                  <div className="flex items-center gap-4">
                    <div className="bg-gold p-3 rounded-full">
                      <Mail size={24} className="text-black" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">البريد الإلكتروني</p>
                      <a href={`mailto:${storeInfo.email}`} className="text-gray-300 hover:text-gold transition-colors">
                        {storeInfo.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Map */}
            <div className="h-64 md:h-80 w-full rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={storeInfo?.latitude && storeInfo?.longitude
                  ? `https://www.google.com/maps?q=${storeInfo.latitude},${storeInfo.longitude}&output=embed`
                  : `https://www.google.com/maps?q=24.6367746,46.7726612&output=embed`}
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>

            <a
              href={storeInfo?.latitude && storeInfo?.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${storeInfo.latitude},${storeInfo.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=24.6367746,46.7726612`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gold hover:text-gold-light font-semibold transition-all group"
            >
              فتح في خرائط جوجل
              <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
