"use client";

import * as amplitude from "@amplitude/unified";

const API_KEY = "6abccb1e76f4ef62ab36570242a097ca";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ANONYMOUS_USER_ID_KEY = "readtime_anonymous_user_id";

let initialized = false;

function getAnonymousUserId() {
  try {
    const savedUserId = window.localStorage.getItem(ANONYMOUS_USER_ID_KEY);
    if (savedUserId) return savedUserId;

    const userId = `anon_${window.crypto.randomUUID()}`;
    window.localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
    return userId;
  } catch {
    return `anon_${window.crypto.randomUUID()}`;
  }
}

export function initializeAnalytics() {
  if (initialized || !IS_PRODUCTION || typeof window === "undefined") return;

  initialized = true;
  amplitude.setUserId(getAnonymousUserId());
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
