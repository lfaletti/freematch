// Static donation configuration for both payment providers.
//
//  - LATAM (MercadoPago countries)  → MercadoPago link (fixed amount, ARS)
//  - Rest of the world              → Ko-fi (variable amount, USD)
//
// This is deliberately kept in ONE static place. Changing a provider, the
// links, or the LATAM country list requires no DB migration or frontend deploy.

export interface DonationMethod {
  provider: 'kofi' | 'mercadopago';
  currency: 'USD' | 'ARS';
  baseUrl: string;
  // Fixed amount shown on the button/label. null means "variable" (Ko-fi uses
  // a free amount on the DonationScreen).
  fixedAmount: number | null;
  // Reserved for future: what a fixed amount represents (e.g. a label suffix).
  label: string;
}

export interface DonationConfig {
  enabled: boolean;
  // Methods this user may choose from (ordered: primary first).
  methods: DonationMethod[];
  // The method that should be highlighted first for this user's region.
  primaryIndex: number;
}

// ── Global switch ──────────────────────────────────────────────────────────
export const DONATION = {
  // Set to true once confident to broadcast the donate entry to everyone.
  ENABLED_FOR_ALL: false,
  ALLOWED_EMAILS: ['REDACTED_EMAIL'],

  // Ko-fi — variable USD (international / rest of the world).
  KOFI: {
    provider: 'kofi' as const,
    currency: 'USD' as const,
    baseUrl: 'https://ko-fi.com/freematch',
    fixedAmount: null,
    label: 'Ko-fi',
  },

  // MercadoPago — free-amount link in ARS (LATAM). The donor chooses the amount
  // on the MercadoPago page itself (fixedAmount is null → no fixed amount).
  MERCADOPAGO: {
    provider: 'mercadopago' as const,
    currency: 'ARS' as const,
    baseUrl: 'https://link.mercadopago.com.ar/freematch',
    fixedAmount: null, // free-amount link: donor picks the amount on MP
    label: 'MercadoPago',
  },
};

// ISO-3166 alpha-2 country codes that use MercadoPago as a primary payment
// method. This drives the region decision.
const LATAM_COUNTRY_CODES: ReadonlySet<string> = new Set([
  'AR', // Argentina
  'BR', // Brazil
  'MX', // Mexico
  'CL', // Chile
  'CO', // Colombia
  'PE', // Peru
  'UY', // Uruguay
  'EC', // Ecuador
  'BO', // Bolivia
  'PY', // Paraguay
  'VE', // Venezuela
  'CR', // Costa Rica
  'PA', // Panama
  'DO', // Dominican Republic
  'GT', // Guatemala
  'HN', // Honduras
  'SV', // El Salvador
  'NI', // Nicaragua
  'CU', // Cuba
  'HT', // Haiti
]);

export function isLatamCountry(countryCode: string | undefined | null): boolean {
  if (!countryCode) return false;
  return LATAM_COUNTRY_CODES.has(countryCode.toUpperCase());
}

// Decide whether a given (authenticated) user may see the donation feature.
// The country tells us which provider to put first.
export function getDonationConfig(
  email: string | null | undefined,
  countryCode: string | undefined | null,
): DonationConfig {
  const normalized = (email ?? '').trim().toLowerCase();
  const enabled =
    normalized.length > 0 &&
    (DONATION.ENABLED_FOR_ALL ||
      DONATION.ALLOWED_EMAILS.some((e) => e.trim().toLowerCase() === normalized));

  if (!enabled) {
    return { enabled: false, methods: [], primaryIndex: 0 };
  }

  const kofi: DonationMethod = { ...DONATION.KOFI };
  const mp: DonationMethod = { ...DONATION.MERCADOPAGO };

  // LATAM: MercadoPago shown first (so locals pay in pesos easily).
  const latam = isLatamCountry(countryCode);
  const methods = latam ? [mp, kofi] : [kofi, mp];
  return { enabled: true, methods, primaryIndex: 0 };
}
