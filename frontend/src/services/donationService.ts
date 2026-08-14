import { api } from './api';

export interface DonationConfig {
  enabled: boolean;
  provider: 'kofi' | 'paypal' | 'other';
  baseUrl: string;
  currency: string;
  amounts: number[];
}

// Fetch donation availability for the current user. The backend decides who
// may donate (whitelist / global flag), so we trust its `enabled`.
export const fetchDonationConfig = async (): Promise<DonationConfig> => {
  const res = await api.get('/api/donation/config');
  return res.data;
};
