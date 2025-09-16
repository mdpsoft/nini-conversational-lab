import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { isGuestModeEnabled } from './useGuestMode';

export function useDevAutoLogin() {
  const [devAutoLoginUsed, setDevAutoLoginUsed] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const { user, loading } = useSupabaseAuth();

  useEffect(() => {
    async function attemptDevAutoLogin() {
      // Only attempt if no user, not in guest mode, dev login is enabled, and not already attempting
      if (user || loading || attempting || isGuestModeEnabled()) {
        return;
      }

      const devAutoSignin = import.meta.env.VITE_DEV_AUTOSIGNIN;
      const devEmail = import.meta.env.VITE_DEV_USER_EMAIL;
      const devPassword = import.meta.env.VITE_DEV_USER_PASSWORD;

      if (devAutoSignin === 'true' && devEmail && devPassword) {
        setAttempting(true);
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: devPassword,
          });

          if (!error) {
            setDevAutoLoginUsed(true);
            console.log('Dev auto-login successful');
          } else {
            console.warn('Dev auto-login failed:', error.message);
          }
        } catch (error) {
          console.warn('Dev auto-login error:', error);
        } finally {
          setAttempting(false);
        }
      }
    }

    attemptDevAutoLogin();
  }, [user, loading, attempting]);

  return {
    devAutoLoginUsed,
    attempting,
  };
}