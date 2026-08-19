import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Profile, AnonymousIdentity, IdentityVerification } from '@/types/database';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [identity, setIdentity] = useState<AnonymousIdentity | null>(null);
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIdentity(null);
      setVerification(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profileRes, identityRes, verifyRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('anonymous_identities')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .maybeSingle(),
        supabase.from('identity_verifications').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (identityRes.error) throw identityRes.error;
      if (verifyRes.error) throw verifyRes.error;

      setProfile(profileRes.data as Profile | null);
      setIdentity(identityRes.data as AnonymousIdentity | null);
      setVerification(verifyRes.data as IdentityVerification | null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, identity, verification, loading, error, reload: load };
}
