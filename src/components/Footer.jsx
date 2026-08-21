"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Facebook, Instagram, Mail, Phone, Video, Youtube, Twitter, Linkedin, MapPin } from "lucide-react";
import { SiTiktok, SiWhatsapp, SiSnapchat } from "react-icons/si";
import { getActiveLogo, getSocialMediaLinks, getStoreInfo, getLogoByType, getAboutPage } from "@/actions/site-management";

const baseNavItems = [
  { name: "الصفحة الرئيسية", href: "/" },
  { name: "من نحن", href: "/about", dynamic: true },
  { name: "السيارات", href: "/cars" },
  { name: "البنوك", href: "/banks" },
  { name: "الشركات", href: "/companies" },
  { name: "اراء العملاء", href: "/reviews" },
  { name: "مقالات", href: "/articles" },
  { name: "تواصل معنا", href: "/contact" },
];

// Icon mapping for social media platforms
const getIconComponent = (platform) => {
  const platformLower = platform.toLowerCase();
  const iconProps = { size: 24 };

  switch (platformLower) {
    case "facebook":
      return <Facebook {...iconProps} />;
    case "instagram":
      return <Instagram {...iconProps} />;
    case "youtube":
      return <Youtube {...iconProps} />;
    case "tiktok":
      return <SiTiktok {...iconProps} />;
    case "whatsapp":
      return <SiWhatsapp {...iconProps} />;
    case "snapchat":
      return <SiSnapchat {...iconProps} />;
    case "twitter":
      return <Twitter {...iconProps} />;
    case "linkedin":
      return <Linkedin {...iconProps} />;
    default:
      return null;
  }
};

const Footer = ({ initialData }) => {
  const router = useRouter();
  const [logo, setLogo] = useState(initialData?.logo);
  const [socialLinks, setSocialLinks] = useState(initialData?.socialLinks || []);
  const [storeInfo, setStoreInfo] = useState(initialData?.storeInfo);
  const [aboutNavLabel, setAboutNavLabel] = useState(initialData?.aboutNavLabel || "من نحن");
  const [loading, setLoading] = useState(!initialData);

  const navItems = baseNavItems.map((item) =>
    item.dynamic ? { ...item, name: aboutNavLabel } : item
  );

  useEffect(() => {
    if (!initialData) {
      loadFooterData();
    }
  }, [initialData]);

  const loadFooterData = async () => {
    try {
      const [logoResult, socialResult, storeResult, aboutResult] = await Promise.all([
        getLogoByType("footer"),
        getSocialMediaLinks(),
        getStoreInfo(),
        getAboutPage(),
      ]);

      if (logoResult.success && logoResult.data) {
        setLogo(logoResult.data);
      }

      if (socialResult.success) {
        const activeSocial = socialResult.data.filter((s) => s.isActive);
        setSocialLinks(activeSocial);
      }

      if (storeResult.success) {
        setStoreInfo(storeResult.data);
      }

      if (aboutResult.success && aboutResult.data?.title) {
        setAboutNavLabel(aboutResult.data.title);
      }
    } catch (error) {
      console.error("Error loading footer data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-black py-12" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo or Brand */}
          <div className="pt-4 text-center">
            <Link href="/" className="flex justify-center items-center gap-2 mb-4">
              {logo ? (
                <Image
                  src={logo.imageUrl}
                  alt={logo.altText || "Logo"}
                  width={100}
                  height={100}
                  className="object-contain h-24 w-auto"
                />
              ) : (
                <Image
                  src="/logo.jpg"
                  alt="Default Logo"
                  width={100}
                  height={100}
                  className="object-contain h-24 w-auto"
                />
              )}
            </Link>
            <p className="text-gray-300 text-sm">
              {storeInfo?.description || "ابحث عن سيارتك المثالية"}
            </p>
          </div>

          {/* Social Media */}
          <div className="pt-4 text-center md:text-right">
            <h3 className="text-lg font-semibold text-white mb-4">تابعنا</h3>
            <div className="flex justify-center md:justify-start space-x-4 flex-wrap gap-2">
              {/* Links come from the database only. The old hard-coded fallback
                  advertised another dealership's accounts on every page load
                  before the fetch resolved. */}
              {!loading && socialLinks.length > 0
                ? socialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.platform}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {social.icon ? (
                      <Image
                        src={social.icon}
                        alt={social.platform}
                        width={24}
                        height={24}
                      />
                    ) : (
                      getIconComponent(social.platform)
                    )}
                  </a>
                  ))
                : null}
            </div>
          </div>

          {/* Contact Info */}
          <div className="pt-4 text-center md:text-right">
            <h3 className="text-lg font-semibold text-white mb-4">تواصل معنا</h3>
            <div className="space-y-2 flex flex-col items-center md:items-start">
              {storeInfo?.email && (
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-gray-300" />
                  <a href={`mailto:${storeInfo.email}`} className="text-gray-300 hover:text-white transition-colors">
                    {storeInfo.email}
                  </a>
                </div>
              )}
              {storeInfo?.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={18} className="text-gray-300" />
                  <a href={`tel:${storeInfo.phone}`} className="text-gray-300 hover:text-white transition-colors">
                    {storeInfo.phone}
                  </a>
                </div>
              )}
              {storeInfo?.whatsapp && (
                <div className="flex items-center gap-2">
                  <SiWhatsapp size={18} className="text-gray-300" />
                  <a href={`https://wa.me/${storeInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                    {storeInfo.whatsapp}
                  </a>
                </div>
              )}
              {storeInfo?.address && (
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-gray-300 mt-1 flex-shrink-0" />
                  <div className="text-gray-300 text-sm">
                    <p>{storeInfo?.address || "69 Car Street, Autoville, CA 69420"}</p>
                    <p>{storeInfo?.city || "Autoville"}</p>
                    <a
                      href={storeInfo.latitude && storeInfo.longitude
                        ? `https://www.google.com/maps/search/?api=1&query=${storeInfo.latitude},${storeInfo.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=24.6367746,46.7726612`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:text-gold-light text-xs font-semibold mt-1 block transition-colors"
                    >
                      عرض الموقع على الخارطة
                    </a>
                  </div>
                </div>
              )}
              {storeInfo?.latitude && storeInfo?.longitude && (
                <div className="mt-4 w-full h-32 rounded-lg overflow-hidden border border-gray-800 hidden md:block">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${storeInfo.latitude},${storeInfo.longitude}&output=embed`}
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="pt-4 text-center md:text-right">
            <h3 className="text-lg font-semibold text-white mb-4">روابط سريعة</h3>
            <div className="grid grid-cols-2 gap-2 justify-items-center md:justify-items-start">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    // Dispatch custom event to show loading immediately
                    window.dispatchEvent(new CustomEvent('startLoading'));
                    router.push(item.href);
                  }}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="pt-4 bg-black mt-2 pb-2">

        </div>
        {/* Copyright */}
        <div className="pt-4 border-t border-gray-700 text-center text-gray-300">
          <p>جميع الحقوق محفوظة {storeInfo?.name || "ماكس موتورز"} © 2025</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
