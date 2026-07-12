/**
 * Fire a GA4 event if analytics is loaded. Safe no-op otherwise.
 * Conversions to watch: `lead_tour_request`, `lead_inquiry`.
 */
export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('event', name, params ?? {});
  }
}
