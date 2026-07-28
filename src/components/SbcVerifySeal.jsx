"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

const SEAL_SCRIPT = "https://eauthenticate.saudibusiness.gov.sa/EAuthSealApi/seal.js";
const SEAL_TOKEN = "dlJYOGw3L0J5dzdXMktXUnAzWHdnQT09";
const ALLOWED_HOSTS = new Set(["maxmotors.sa", "www.maxmotors.sa"]);
const SCRIPT_TIMEOUT_MS = 8000;
const VERIFY_URL =
  process.env.NEXT_PUBLIC_SBC_CERTIFICATE_URL ||
  "https://eauthenticate.saudibusiness.gov.sa/inquiry";

export default function SbcVerifySeal() {
  const mountRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ALLOWED_HOSTS.has(window.location.hostname)) return;

    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let observer;

    const revealFallback = () => {
      if (!cancelled) setShowFallback(true);
    };

    const hideFallbackIfOfficialLoaded = () => {
      if (!mount || cancelled) return;
      const hasOfficialContent =
        mount.childElementCount > 0 ||
        mount.querySelector("iframe, img, canvas, svg, a") != null;
      if (hasOfficialContent) setShowFallback(false);
    };

    observer = new MutationObserver(hideFallbackIfOfficialLoaded);
    observer.observe(mount, { childList: true, subtree: true });

    if (document.querySelector(`script[data-sbc-seal="true"]`)) {
      hideFallbackIfOfficialLoaded();
      if (!mount.childElementCount) revealFallback();
      return () => {
        cancelled = true;
        observer?.disconnect();
      };
    }

    const timeoutId = window.setTimeout(() => {
      hideFallbackIfOfficialLoaded();
      if (!mount.childElementCount) revealFallback();
    }, SCRIPT_TIMEOUT_MS);

    const script = document.createElement("script");
    script.src = SEAL_SCRIPT;
    script.async = true;
    script.dataset.sbcSeal = "true";

    script.onload = () => {
      window.setTimeout(() => {
        hideFallbackIfOfficialLoaded();
        if (!mount.childElementCount) revealFallback();
      }, 1500);
    };

    script.onerror = revealFallback;

    document.body.appendChild(script);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [mounted]);

  if (!mounted || !ALLOWED_HOSTS.has(window.location.hostname)) {
    return null;
  }

  return (
    <>
      <div
        ref={mountRef}
        className="sbc-verify-seal"
        data-token={SEAL_TOKEN}
        data-position="bottom-left"
        data-domain="maxmotors.sa"
      />

      {showFallback && (
        <a
          href={VERIFY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="sbc-verify-fallback fixed z-[9999] left-4 bottom-24 md:left-6 md:bottom-28 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-black/90 px-3 py-2 text-white shadow-lg backdrop-blur-sm transition hover:border-emerald-400/50 hover:bg-black"
          aria-label="متجر موثق - المركز السعودي للأعمال"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <span className="text-xs leading-tight">
            <span className="block font-semibold text-emerald-300">متجر موثق</span>
            <span className="block text-[10px] text-gray-300">المركز السعودي للأعمال</span>
          </span>
        </a>
      )}
    </>
  );
}
