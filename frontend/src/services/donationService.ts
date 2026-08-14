import { api } from './api';

export type DonationProvider = 'kofi' | 'mercadopago';

export interface DonationMethod {
  provider: DonationProvider;
  currency: 'USD' | 'ARS';
  baseUrl: string;
  fixedAmount: number | null;
  label: string;
}

export interface DonationConfig {
  enabled: boolean;
  // Ordered by priority (methods[primaryIndex] is the one to highlight first).
  methods: DonationMethod[];
  primaryIndex: number;
}

// Fetch donation availability for the current user. The backend decides who
// may donate (email whitelist / global flag) and which provider to lead with
// (MercadoPago for LATAM, Ko-fi elsewhere), so we trust its response.
export const fetchDonationConfig = async (): Promise<DonationConfig> => {
  const res = await api.get('/api/donation/config');
  return res.data;
};
