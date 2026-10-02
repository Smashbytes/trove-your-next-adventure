// PostHog product analytics — wired per the published Privacy Policy
// (welovetrove.co.za/legal/privacy): legal basis is legitimate interest with
// anonymised events, and users can switch it off in Settings → Privacy & data.
// We therefore never call posthog.identify() — events stay anonymous — and the
// opt-out persists in guest prefs. Events are tagged app:"guest" so the shared
// PostHog project segments cleanly across the website, guest app and engine.
import posthog from "posthog-js";
import type { AnyRouter } from "@tanstack/react-router";
import { getGuestPrefs, patchGuestPrefs } from "@/lib/guest-prefs";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://eu.i.posthog.com";

let initCalled = false;

function loaded(): boolean {
  return (posthog as unknown as { __loaded?: boolean }).__loaded === true;
}

function init() {
  if (!KEY || typeof window === "undefined" || initCalled) return;
  initCalled = true;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // captured on router resolution instead
    capture_pageleave: true,
    person_profiles: "identified_only", // never identified → stays anonymous
    autocapture: false, // pageviews + explicit events only
    loaded: (ph) => {
      // Clear a persisted SDK opt-out left over from an earlier session if
      // the user has since re-enabled analytics in Settings.
      if (isAnalyticsEnabled() && ph.has_opted_out_capturing()) {
        ph.opt_in_capturing();
      }
    },
  });
  posthog.register({ app: "guest" });
}

export function isAnalyticsEnabled(): boolean {
  return getGuestPrefs().analytics;
}

export function setAnalyticsEnabled(enabled: boolean) {
  patchGuestPrefs({ analytics: enabled });
  if (enabled) {
    if (loaded()) {
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    } else {
      init();
    }
  } else if (loaded() && !posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
  }
}

let lastUrl: string | null = null;

function capturePageview() {
  // capture() queues safely while the SDK is still async-loading, and no-ops
  // when the user has opted out — only skip if init was never called at all.
  if (!initCalled || !isAnalyticsEnabled()) return;
  const url = window.location.href;
  if (url === lastUrl) return; // dedupe: initial load may also emit onResolved
  lastUrl = url;
  posthog.capture("$pageview", { $current_url: url });
}

/** Call once from getRouter(); captures a $pageview per navigation. */
export function initAnalytics(router: AnyRouter) {
  if (!KEY || typeof window === "undefined") return;
  if (isAnalyticsEnabled()) init();
  // onResolved only fires for in-app navigations, so capture the initial
  // page load explicitly.
  capturePageview();
  router.subscribe("onResolved", capturePageview);
}
