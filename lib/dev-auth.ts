/**
 * Development authentication bypass for v0 preview environment
 * This allows testing the app in the v0 iframe without real auth
 */

export const DEV_MODE = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@weddingos.dev',
  user_metadata: {
    full_name: 'Demo User',
  },
};

export const DEV_PROJECT = {
  id: '00000000-0000-0000-0000-000000000010',
  name: 'Marie & Lucas Wedding',
  wedding_date: '2025-09-15',
  location: 'Château de Versailles',
  country: 'FR',
  guest_count: 120,
  currency: 'EUR',
  total_budget: 50000,
  style: 'elegant',
  created_by: DEV_USER.id,
};

export function isInV0Preview(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // If we can't access window.top, we're likely in an iframe
  }
}

export function shouldBypassAuth(): boolean {
  return DEV_MODE && isInV0Preview();
}
