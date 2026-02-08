import { createClient as createSupabaseClient } from './server';
import { DEV_USER, shouldBypassAuth } from '../dev-auth';

/**
 * Enhanced server client that bypasses auth in v0 preview
 */
export async function createClient() {
  const supabase = await createSupabaseClient();
  
  // In dev mode within v0 iframe, return a mock auth response
  if (shouldBypassAuth()) {
    const originalAuthGetUser = supabase.auth.getUser.bind(supabase.auth);
    
    supabase.auth.getUser = async () => {
      return {
        data: {
          user: DEV_USER as any,
        },
        error: null,
      };
    };
  }
  
  return supabase;
}
