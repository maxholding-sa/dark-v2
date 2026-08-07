"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Route-level error boundary. Replaces Next.js's raw
 * "Application error: a client-side exception has occurred" screen.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="flex min-h-[60vh] items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md rounded-2xl border border-yellow-700/60 bg-black/80 p-8 text-center text-white shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>

        <h2 className="mb-2 text-xl font-bold">حدث خطأ غير متوقع</h2>
        <p className="mb-6 text-sm leading-relaxed text-white/70">
          نعتذر عن الإزعاج. يمكنك إعادة المحاولة الآن، وإذا استمرت المشكلة يرجى
          التواصل معنا وسنساعدك في إكمال طلبك.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-yellow-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-yellow-800"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <Home className="h-4 w-4" />
            الصفحة الرئيسية
          </Link>
        </div>

        {error?.digest ? (
          <p className="mt-6 text-[11px] text-white/40">
            رقم الخطأ: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
