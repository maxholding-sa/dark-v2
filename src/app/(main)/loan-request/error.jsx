"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";
import { isBenignRequestError } from "@/lib/is-benign-request-error";

/**
 * Loan-flow error boundary. The financing steps do a lot of client-side math,
 * so a failure here must land on a recoverable screen with a human fallback
 * rather than the raw Next.js client-exception page.
 */
export default function LoanRequestError({ error, reset }) {
  useEffect(() => {
    if (isBenignRequestError(error)) {
      reset();
      return;
    }
    console.error("[loan-request-error]", error);
  }, [error, reset]);

  if (isBenignRequestError(error)) {
    return null;
  }

  return (
    <div dir="rtl" className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-gold-dark/60 bg-black/85 p-8 text-center text-white shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>

        <h2 className="mb-2 text-xl font-bold">تعذر إكمال طلب التمويل</h2>
        <p className="mb-6 text-sm leading-relaxed text-white/70">
          حدث خطأ أثناء تجهيز عروض التمويل. يرجى إعادة المحاولة — وإذا تكرر
          الأمر تواصل معنا مباشرة وسنكمل طلبك يدوياً.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gold-dark px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold-dark"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <Mail className="h-4 w-4" />
            تواصل معنا
          </Link>
        </div>

        {error?.digest ? (
          <p className="mt-6 text-[11px] text-white/40">رقم الخطأ: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
