// PostHog product analytics — wired per the published Privacy Policy
// (welovetrove.co.za/legal/privacy): legal basis is legitimate interest with
// anonymised events, and users can switch it off in Settings → Privacy & data.
// We therefore never call posthog.identify() — events stay anonymous — and the
// opt-out persists in guest prefs. Events are tagged app:"guest" so the shared
// PostHog project segments cleanly across the website, guest app and engine.
//
// The SDK is dynamic-imported so it never sits in the entry bundle; events
// raised before it arrives are queued and flushed once it has loaded.
import type { PostHog } from "posthog-js";
import type { AnyRouter } from "@tanstack/react-router";
import { getGuestPrefs, patchGuestPrefs } from "@/lib/guest-prefs";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://eu.i.posthog.com";

let ph: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: string[] = [];

function init(): Promise<PostHog | null> {
  if (!KEY || typeof window === "undefined") return Promise.resolve(null);
  if (loading) return loading;
  loading = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        capture_pageview: false, // captured on router resolution instead
        capture_pageleave: true,
        person_profiles: "identified_only", // never identified → stays anonymous
        autocapture: false, // pageviews + explicit events only
        // Anonymous pageview stats only. These add-ons each download an extra
        // script from PostHog; we use none of them (and the Privacy Policy
        // covers anonymous usage stats, not recordings), and on a slow
        // connection the download keeps the browser "loading".
        disable_surveys: true,
        disable_session_recording: true,
        disable_web_experiments: true,
      });
      posthog.register({ app: "guest" });
      // Honour the current preference, even if it changed while loading, and
      // clear a persisted SDK opt-out left over from an earlier session.
      if (!isAnalyticsEnabled()) posthog.opt_out_capturing();
      else if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
      ph = posthog;
      for (const url of queue.splice(0)) send(url);
      return posthog;
    })
    .catch(() => null);
  return loading;
}

export function isAnalyticsEnabled(): boolean {
  return getGuestPrefs().analytics;
}

export function setAnalyticsEnabled(enabled: boolean) {
  patchGuestPrefs({ analytics: enabled });
  if (enabled) {
    if (ph) {
      if (ph.has_opted_out_capturing()) ph.opt_in_capturing();
    } else {
      void init();
    }
  } else if (ph && !ph.has_opted_out_capturing()) {
    ph.opt_out_capturing();
  }
}

let lastUrl: string | null = null;

function send(url: string) {
  ph?.capture("$pageview", { $current_url: url });
}

function capturePageview() {
  if (!loading || !isAnalyticsEnabled()) return;
  const url = window.location.href;
  if (url === lastUrl) return; // dedupe: initial load may also emit onResolved
  lastUrl = url;
  if (ph) send(url);
  else queue.push(url);
}

/** Call once from getRouter(); captures a $pageview per navigation. */
export function initAnalytics(router: AnyRouter) {
  if (!KEY || typeof window === "undefined") return;
  if (isAnalyticsEnabled()) void init();
  // onResolved only fires for in-app navigations, so capture the initial
  // page load explicitly.
  capturePageview();
  router.subscribe("onResolved", capturePageview);
}
