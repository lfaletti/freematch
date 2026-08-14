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
  ALLOWED_EMAILS: ['REDACTED_EMAIL', 'REDACTED_EMAIL'],

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

// MercadoPago links are tied to an Argentina account (`link.mercadopago.com.ar`)
// and pay in ARS, so the MercadoPago option is only offered to Argentina users.
// Everyone else (including other LATAM countries with a different currency)
// goes through Ko-fi in USD.
const mercadopagoCountries: ReadonlySet<string> = new Set(['AR']);

export function isMercadoPagoCountry(countryCode: string | undefined | null): boolean {
  if (!countryCode) return false;
  return mercadopagoCountries.has(countryCode.toUpperCase());
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

  // Argentina: MercadoPago shown first (pay in pesos). Everyone else → Ko-fi.
  const arg = isMercadoPagoCountry(countryCode);
  const methods = arg ? [mp, kofi] : [kofi, mp];
  return { enabled: true, methods, primaryIndex: 0 };
}
