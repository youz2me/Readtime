"use client";

import * as amplitude from "@amplitude/unified";

const API_KEY = "6abccb1e76f4ef62ab36570242a097ca";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

let initialized = false;

export function initializeAnalytics() {
  if (initialized || !IS_PRODUCTION || typeof window === "undefined") return;

  initialized = true;
  amplitude.initAll(API_KEY, {
    analytics: {
      autocapture: true,
    },
    sessionReplay: {
      sampleRate: 1,
    },
  });
}

export function trackEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (!initialized) return;
  amplitude.track(name, {
    ...properties,
    environment: "production",
  });
}
