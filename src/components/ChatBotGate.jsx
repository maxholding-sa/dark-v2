"use client";

import { useSearchParams } from "next/navigation";
import ChatBot from "@/components/ChatBot";

// Ad and analytics params ride along on campaign links (/?utm_source=...,
// /cars?gclid=...). They don't change what the page shows, so they must not
// hide the widget — paid traffic is exactly who we want it in front of.
const TRACKING_PARAMS = new Set([
  "gclid",
  "fbclid",
  "msclkid",
  "ttclid",
  "igshid",
  "ref",
]);

const isTrackingParam = (key) =>
  key.startsWith("utm_") || TRACKING_PARAMS.has(key);

/**
 * Renders the chat widget only on a bare listing URL.
 *
 * ClientWrapper already restricts this to "/" and "/cars"; the remaining job is
 * excluding paginated, filtered, sorted and searched listings (/cars?page=2),
 * which usePathname() cannot distinguish because it drops the query string.
 *
 * useSearchParams() opts everything above it into client-side rendering unless
 * it sits inside a Suspense boundary, so the check lives in this leaf component
 * rather than in ClientWrapper.
 */
export default function ChatBotGate() {
  const searchParams = useSearchParams();

  for (const key of searchParams.keys()) {
    if (!isTrackingParam(key)) return null;
  }

  return <ChatBot />;
}
