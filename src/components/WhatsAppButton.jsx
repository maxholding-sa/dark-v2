"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton({ phoneNumber, className = "", fixed = true, text = "", label = "", bottomOffset = "bottom-4 md:bottom-6", rightOffset = "right-4 md:right-6", enabled = true }) {
  if (!enabled) return null;
  // Clean the phone number: remove + and spaces
  const cleanPhoneNumber = phoneNumber ? phoneNumber.replace(/[\+\s]/g, '') : '';
  const encodedText = text ? encodeURIComponent(text) : '';
  const whatsappUrl = encodedText ? `https://wa.me/${cleanPhoneNumber}?text=${encodedText}` : `https://wa.me/${cleanPhoneNumber}`;

  if (fixed) {
    return (
      <div className={`fixed ${bottomOffset} ${rightOffset} z-50 flex flex-col items-center`}>
        {/* Label */}
        <span className="text-white text-xs mb-2 bg-black/50 px-2 py-1 rounded backdrop-blur-sm md:whitespace-nowrap whitespace-pre-line text-center">
          {label || text || 'تواصل\nمعنا'}
        </span>

        {/* Pulsing circle background */}
        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20 blur-sm"></div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full p-3 md:p-4 shadow-2xl transition-all duration-300 hover:scale-110 flex items-center border border-white/30"
          aria-label="تواصل عبر واتساب"
        >
          <FaWhatsapp className="h-5 w-5 md:h-6 md:w-6" />
        </a>
      </div>
    );
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center border border-white/30 ${className}`}
      aria-label="تواصل عبر واتساب"
    >
      <FaWhatsapp className="h-4 w-4" />
    </a>
  );
}
