"use client";

import * as amplitude from "@amplitude/analytics-browser";

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const environment = process.env.NODE_ENV === "production" ? "production" : "development";

let initialized = false;

export function initializeAnalytics() {
  if (initialized || !API_KEY || typeof window === "undefined") return;

  amplitude.init(API_KEY, {
    autocapture: false,
    trackingOptions: {
      ipAddress: false,
    },
  });
  initialized = true;
}

export function trackEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (!initialized) return;
  amplitude.track(name, {
    ...properties,
    environment,
  });
}
