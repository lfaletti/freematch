// Static donation configuration. This keeps the setup in ONE place so it can
// be changed without a database migration or touching the frontend.
//
// To change the payment provider (Ko-fi → PayPal → anything), just update
// BASE_URL. To widen availability, either add emails to ALLOWED_EMAILS or set
// ENABLED_FOR_ALL to true (see getDonationConfig).

export type DonationCurrency = 'USD';

export interface DonationConfig {
  enabled: boolean;
  provider: 'kofi' | 'paypal' | 'other';
  baseUrl: string;
  currency: DonationCurrency;
  amounts: number[];
}

// Monotonic business rule: donations are currently visible only to a small
// whitelist. Set ENABLED_FOR_ALL=true to open it up to every user.
export const DONATION = {
  // Set to true once confident to broadcast it to everyone.
  ENABLED_FOR_ALL: false,
  // Emails allowed to see the donate entry (case-insensitive). Ignored when
  // ENABLED_FOR_ALL is true. Add more here later (e.g. other maintainers).
  ALLOWED_EMAILS: ['REDACTED_EMAIL'],
  PROVIDER: 'kofi' as const,
  // Ko-fi: all amounts go to the same page, where the donor picks the amount.
  // If you switch to a provider that supports an amount in the URL
  // (e.g. ?amount=X), read it here on the client to prefill.
  BASE_URL: 'https://ko-fi.com/freematch',
  CURRENCY: 'USD' as const,
  // Suggested amounts shown on the donation screen.
  AMOUNTS: [3, 5, 10, 20],
};

// Decide whether a given (authenticated) user may see the donation feature.
// This is the single source of truth for the gating rule.
export function getDonationConfig(email: string | null | undefined): DonationConfig {
  // Only authenticated users with an email can be considered.
  const normalized = (email ?? '').trim().toLowerCase();

  const enabled =
    normalized.length > 0 &&
    (DONATION.ENABLED_FOR_ALL ||
      DONATION.ALLOWED_EMAILS.some((e) => e.trim().toLowerCase() === normalized));

  return {
    enabled,
    provider: DONATION.PROVIDER,
    baseUrl: DONATION.BASE_URL,
    currency: DONATION.CURRENCY,
    amounts: DONATION.AMOUNTS,
  };
}
