"use client";

import { useEffect } from "react";

const SEAL_SRC =
  "https://eauthenticate.saudibusiness.gov.sa/EAuthSealApi/seal.js";
const LOAD_TIMEOUT_MS = 8000;

/**
 * Saudi Business Center verified-store seal. Mounted on the home page only.
 *
 * Injects the official script with a short timeout so an unreachable
 * government host (net::ERR_CONNECTION_TIMED_OUT) does not hang the page.
 * Because this lives on one route rather than the root layout, it unmounts on
 * navigation — so the cleanup must remove the injected script, otherwise the
 * "already injected" guard would suppress the seal when the user returns home.
 */
export default function SbcVerifySeal({
  token = "dlJYOGw3L0J5dzdXMktXUnAzWHdnQT09",
  position = "bottom-left",
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.querySelector(`script[data-sbc-seal="1"]`)) return;

    // Seal is registered for the live apex domain only.
    const host = window.location.hostname;
    if (host !== "maxmotors.sa" && host !== "www.maxmotors.sa") return;

    const script = document.createElement("script");
    script.src = SEAL_SRC;
    script.async = true;
    script.dataset.sbcSeal = "1";

    const timer = setTimeout(() => {
      script.remove();
    }, LOAD_TIMEOUT_MS);

    script.onload = () => clearTimeout(timer);
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
    };

    document.body.appendChild(script);

    return () => {
      clearTimeout(timer);
      script.remove();
    };
  }, []);

  return (
    <div
      className="sbc-verify-seal"
      data-token={token}
      data-position={position}
    />
  );
}
