"use client";

import { useEffect } from "react";

const SEAL_SCRIPT = "https://eauthenticate.saudibusiness.gov.sa/EAuthSealApi/seal.js";
const SEAL_TOKEN = "dlJYOGw3L0J5dzdXMktXUnAzWHdnQT09";
const ALLOWED_HOSTS = new Set(["maxmotors.sa", "www.maxmotors.sa"]);

export default function SbcVerifySeal() {
  useEffect(() => {
    if (!ALLOWED_HOSTS.has(window.location.hostname)) return;

    let mount = document.querySelector(".sbc-verify-seal");
    if (!mount) {
      mount = document.createElement("div");
      mount.className = "sbc-verify-seal";
      mount.setAttribute("data-token", SEAL_TOKEN);
      mount.setAttribute("data-position", "bottom-left");
      mount.setAttribute("data-domain", "maxmotors.sa");
      document.body.appendChild(mount);
    }

    if (document.querySelector(`script[src="${SEAL_SCRIPT}"]`)) return;

    const script = document.createElement("script");
    script.src = SEAL_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div
      className="sbc-verify-seal"
      data-token={SEAL_TOKEN}
      data-position="bottom-left"
      data-domain="maxmotors.sa"
    />
  );
}
