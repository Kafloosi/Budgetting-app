import { AppSettings } from '../types';

/**
 * Budget Pro: a one-time unlock. On a store build this flips via in-app
 * purchase (Google Play Billing / Apple IAP — required by store policy for
 * digital goods, pluggable here via e.g. RevenueCat). For sideloaded builds
 * the same switch flips through an unlock code redeemed in Settings.
 *
 * Every gate in the app goes through isUnlocked, so when purchases arrive
 * only this module changes.
 */
export const PREMIUM_PRICE_LABEL = '€10';

export type PremiumFeature = 'insights' | 'widget' | 'goalAutos';

export const PREMIUM_FEATURES: Record<PremiumFeature, string> = {
  insights: '📈 Insights — smart monthly spending analysis',
  widget: '📱 Home-screen widget with your live balance',
  goalAutos: '🎯 Automatic monthly goal contributions',
};

/** Marketing copy for the paywall, including the non-feature support line */
export const PREMIUM_SELLING_POINTS = [
  ...Object.values(PREMIUM_FEATURES),
  '💛 Support further development',
];

/**
 * The one place that decides whether a premium feature is available.
 * Takes settings rather than a hook so non-React callers (the widget task
 * handler, state transitions) use the exact same rule.
 */
export function isUnlocked(
  settings: Pick<AppSettings, 'premium'>,
  _feature: PremiumFeature,
): boolean {
  // Today Pro is all-or-nothing; the feature argument keeps call sites
  // honest so tiers or per-feature entitlements can land here alone.
  return settings.premium;
}

/**
 * Offline unlock code check. Format: PRO-XXXXY where X are letters/digits and
 * Y is a checksum character derived from the rest. Codes are validated
 * without a server, so treat them like gift codes, not like DRM.
 */
export function validateUnlockCode(input: string): boolean {
  const code = input.trim().toUpperCase();
  const match = /^PRO-([A-Z0-9]{4})([A-Z])$/.exec(code);
  if (!match) return false;
  const [, body, check] = match;
  const sum = [...body].reduce((s, c) => s + c.charCodeAt(0), 0);
  const expected = String.fromCharCode(65 + ((sum * 7) % 26));
  return check === expected;
}
