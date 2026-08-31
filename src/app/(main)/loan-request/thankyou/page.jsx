"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStoreInfo } from "@/actions/site-management";
import { CheckCircle, MessageSquare, Phone, Home, Clock, Shield, Star } from "lucide-react";

const cleanPhoneNumber = (value) => String(value || "").replace(/\D/g, "");

function ThankYouContent() {
  const searchParams = useSearchParams();
  const isCustom = searchParams.get("custom") === "true";
  const [storeContact, setStoreContact] = useState({ phone: null, whatsapp: null });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const result = await getStoreInfo();
        if (result.success && result.data) {
          setStoreContact({
            phone: result.data.phone || null,
            whatsapp: result.data.whatsapp || null,
          });
        }
      } catch (e) {
        console.error("Failed to load store contact", e);
      }
    };
    fetchContact();

    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const whatsappHref = storeContact.whatsapp
    ? `https://wa.me/${cleanPhoneNumber(storeContact.whatsapp)}?text=${encodeURIComponent("السلام عليكم، قدمت طلب تمويل للسيارة وأريد متابعته.")}`
    : null;

  const phoneHref = storeContact.phone
    ? `tel:${cleanPhoneNumber(storeContact.phone)}`
    : null;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100dvh",
        width: "100dvw",
        maxWidth: "100dvw",
        marginInline: "calc(50% - 50dvw)",
        backgroundImage: "url(/back.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(10,10,30,0.6) 100%)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "520px",
          transform: visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.45s ease",
        }}
      >
        {/* Main Card */}
        <div
          style={{
            background: "rgba(15, 15, 30, 0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "24px",
            border: "1px solid rgba(201,162,39,0.25)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,162,39,0.1) inset",
            overflow: "hidden",
          }}
        >
          {/* Gold top accent bar with shimmer */}
          <div
            style={{
              height: "4px",
              background: "linear-gradient(90deg, #a67c00, #e8c76b, #c9a227, #a67c00)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.5s linear infinite",
            }}
          />

          <div style={{ padding: "2.5rem 2rem 2rem" }}>
            {/* Success Icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {/* Glow ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: "-8px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)",
                    animation: "pulse-glow 2s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.15) 100%)",
                    border: "2px solid rgba(34,197,94,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle style={{ width: "48px", height: "48px", color: "#22c55e" }} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", margin: 0, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                تم إرسال طلبك بنجاح!
              </h1>
              <p style={{ color: "rgba(255,255,255,0.65)", marginTop: "0.6rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
                تلقّينا طلب التمويل الخاص بك وسيتواصل معك أحد متخصصينا في أقرب وقت ممكن.
              </p>

              {isCustom && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.85rem 1rem",
                    borderRadius: "14px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#fef08a",
                    fontSize: "0.88rem",
                    lineHeight: "1.55",
                    textAlign: "center",
                    fontWeight: "500",
                  }}
                >
                  💡 تم تحديد طلب سيارة خاصة. سيتم قبول الطلب وسيساعدك ممثلنا في تحديد السعر وتفاصيل التمويل المناسبة.
                </div>
              )}
            </div>

            {/* Info chips */}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", margin: "1.25rem 0 1.75rem" }}>
              {[
                { icon: Clock, label: "رد خلال 24 ساعة" },
                { icon: Shield, label: "بياناتك آمنة" },
                { icon: Star, label: "خدمة متخصصة" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.8rem",
                    borderRadius: "100px",
                    background: "rgba(201,162,39,0.1)",
                    border: "1px solid rgba(201,162,39,0.2)",
                    color: "#e8c76b",
                    fontSize: "0.78rem",
                    fontWeight: "600",
                  }}
                >
                  <Icon style={{ width: "13px", height: "13px" }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.3), transparent)", margin: "0 0 1.5rem" }} />

            {/* CTA Heading */}
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", fontWeight: "600", marginBottom: "1rem" }}>
              هل تريد متابعة طلبك الآن؟
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* WhatsApp Button */}
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="whatsapp-followup-btn"
                  className="thankyou-btn-whatsapp"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.65rem",
                    padding: "0.9rem 1.5rem",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #128c7e 0%, #25d366 100%)",
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "1rem",
                    textDecoration: "none",
                    boxShadow: "0 6px 24px rgba(37,211,102,0.3)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  }}
                >
                  <MessageSquare style={{ width: "22px", height: "22px", flexShrink: 0 }} />
                  تواصل عبر واتساب
                </a>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.65rem",
                    padding: "0.9rem 1.5rem",
                    borderRadius: "14px",
                    background: "rgba(37,211,102,0.06)",
                    border: "1px dashed rgba(37,211,102,0.2)",
                    color: "rgba(37,211,102,0.35)",
                    fontWeight: "600",
                    fontSize: "1rem",
                    cursor: "not-allowed",
                  }}
                >
                  <MessageSquare style={{ width: "22px", height: "22px", flexShrink: 0 }} />
                  واتساب غير متاح حالياً
                </div>
              )}

              {/* Call Button */}
              {phoneHref ? (
                <a
                  href={phoneHref}
                  id="call-followup-btn"
                  className="thankyou-btn-call"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.65rem",
                    padding: "0.9rem 1.5rem",
                    borderRadius: "14px",
                    background: "rgba(201,162,39,0.12)",
                    border: "1.5px solid rgba(201,162,39,0.4)",
                    color: "#e8c76b",
                    fontWeight: "700",
                    fontSize: "1rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(201,162,39,0.1)",
                    transition: "transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
                  }}
                >
                  <Phone style={{ width: "22px", height: "22px", flexShrink: 0 }} />
                  اتصل بنا الآن
                </a>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.65rem",
                    padding: "0.9rem 1.5rem",
                    borderRadius: "14px",
                    background: "rgba(201,162,39,0.04)",
                    border: "1px dashed rgba(201,162,39,0.15)",
                    color: "rgba(201,162,39,0.3)",
                    fontWeight: "600",
                    fontSize: "1rem",
                    cursor: "not-allowed",
                  }}
                >
                  <Phone style={{ width: "22px", height: "22px", flexShrink: 0 }} />
                  رقم الهاتف غير متاح حالياً
                </div>
              )}

              {/* Home Button */}
              <Link
                href="/"
                id="back-home-btn"
                className="thankyou-btn-home"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.65rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  transition: "color 0.18s ease, background 0.18s ease",
                }}
              >
                <Home style={{ width: "18px", height: "18px", flexShrink: 0 }} />
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginTop: "1.25rem" }}>
          ماكس موتورز — شريكك في التمويل
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .thankyou-btn-whatsapp:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 32px rgba(37,211,102,0.4) !important;
        }
        .thankyou-btn-call:hover {
          transform: translateY(-2px) !important;
          background: rgba(201,162,39,0.22) !important;
          box-shadow: 0 8px 24px rgba(201,162,39,0.2) !important;
        }
        .thankyou-btn-home:hover {
          color: rgba(255,255,255,0.85) !important;
          background: rgba(255,255,255,0.09) !important;
        }
      `}</style>
    </div>
  );
}

export default function LoanRequestThankYouPage() {
  return (
    <Suspense fallback={null}>
      <ThankYouContent />
    </Suspense>
  );
}
