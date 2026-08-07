"use client";

import { FaWhatsapp } from "react-icons/fa";

// Sits on the left, clear of the chat launcher on the right and stacked above
// the Saudi Business Center seal, which anchors itself to the bottom-left corner.
const DEFAULT_BOTTOM_OFFSET = "bottom-32 md:bottom-36";
const DEFAULT_SIDE_OFFSET = "left-4 md:left-6";

export default function WhatsAppButton({ phoneNumber, className = "", fixed = true, text = "", label = "", bottomOffset = DEFAULT_BOTTOM_OFFSET, sideOffset = DEFAULT_SIDE_OFFSET, enabled = true }) {
  if (!enabled) return null;
  // Clean the phone number: remove + and spaces
  const cleanPhoneNumber = phoneNumber ? phoneNumber.replace(/[\+\s]/g, '') : '';
  const encodedText = text ? encodeURIComponent(text) : '';
  const whatsappUrl = encodedText ? `https://wa.me/${cleanPhoneNumber}?text=${encodedText}` : `https://wa.me/${cleanPhoneNumber}`;

  if (fixed) {
    return (
      <div className={`fixed ${bottomOffset} ${sideOffset} z-50 flex flex-col items-center`}>
        {/* Caption is opt-in via the admin "نص التسمية فوق الزر" setting — no default text. */}
        {label ? (
          <span className="text-white text-xs mb-2 bg-black/50 px-2 py-1 rounded backdrop-blur-sm md:whitespace-nowrap whitespace-pre-line text-center">
            {label}
          </span>
        ) : null}

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
