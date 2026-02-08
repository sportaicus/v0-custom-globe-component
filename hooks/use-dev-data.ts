// Dev mode data fetching - bypasses auth in preview
import { createClient } from '@/lib/supabase/client';
import { isDevMode, getDevProjectId, DEV_USER_ID } from '@/lib/dev-constants';

export const useDevProject = () => {
  if (!isDevMode()) return null;
  return {
    id: getDevProjectId(),
    name: 'Marie & Lucas Wedding',
    wedding_date: '2025-09-15',
    location: 'Château de Versailles',
    country: 'FR',
    guest_count: 120,
    currency: 'EUR',
    total_budget: 50000,
    style: 'elegant',
    created_by: DEV_USER_ID,
  };
};

export const useDevUser = () => {
  if (!isDevMode()) return null;
  return {
    id: DEV_USER_ID,
    email: 'demo@weddingos.local',
    user_metadata: { full_name: 'Demo User' },
  };
};
