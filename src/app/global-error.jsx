"use client";

import { useEffect } from "react";
import { isBenignRequestError } from "@/lib/is-benign-request-error";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * normal error.jsx cannot render. Must supply its own <html>/<body>.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (isBenignRequestError(error)) {
      reset();
      return;
    }
    console.error("[global-error]", error);
  }, [error, reset]);

  if (isBenignRequestError(error)) {
    return (
      <html lang="ar" dir="rtl">
        <body style={{ margin: 0, background: "#000" }} />
      </html>
    );
  }

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontFamily: "Tahoma, Arial, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            حدث خطأ غير متوقع
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.7)",
              marginBottom: "1.5rem",
            }}
          >
            نعتذر عن الإزعاج. يرجى إعادة تحميل الصفحة، وإذا استمرت المشكلة تواصل
            معنا وسنساعدك.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#a16207",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
          {error?.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)" }}>
              رقم الخطأ: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
