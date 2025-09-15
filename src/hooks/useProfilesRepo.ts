import { useState, useEffect } from 'react';
import { UserAIProfile } from '@/store/profiles';
import { ProfilesRepo, DataSource, resolveProfilesRepoAsync } from '@/data/useraiProfiles';
import { useSupabaseAuth } from './useSupabaseAuth';

export function useProfilesRepo() {
  const { isAuthenticated, loading: authLoading } = useSupabaseAuth();
  const [repo, setRepo] = useState<ProfilesRepo | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('Local');
  const [profiles, setProfiles] = useState<UserAIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve repository when auth state changes
  useEffect(() => {
    if (authLoading) return;

    const resolveRepo = async () => {
      try {
        const { repo: resolvedRepo, source } = await resolveProfilesRepoAsync();
        setRepo(resolvedRepo);
        setDataSource(source);
        setError(null);
      } catch (err) {
        console.error('Failed to resolve profiles repository:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    resolveRepo();
  }, [isAuthenticated, authLoading]);

  // Load profiles when repository changes
  useEffect(() => {
    if (!repo) return;

    const loadProfiles = async () => {
      setLoading(true);
      try {
        const loadedProfiles = await repo.list();
        setProfiles(loadedProfiles);
        setError(null);
      } catch (err) {
        console.error('Failed to load profiles:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profiles');
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [repo]);

  const refreshProfiles = async () => {
    if (!repo) return;
    
    try {
      const loadedProfiles = await repo.list();
      setProfiles(loadedProfiles);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh profiles');
    }
  };

  const upsertProfile = async (profile: UserAIProfile) => {
    if (!repo) throw new Error('Repository not available');
    
    try {
      await repo.upsert(profile);
      await refreshProfiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const removeProfile = async (id: string) => {
    if (!repo) throw new Error('Repository not available');
    
    try {
      await repo.remove(id);
      await refreshProfiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const bulkUpsertProfiles = async (profilesToUpsert: UserAIProfile[]) => {
    if (!repo) throw new Error('Repository not available');
    
    try {
      await repo.bulkUpsert(profilesToUpsert);
      await refreshProfiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk save profiles';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    profiles,
    dataSource,
    loading: loading || authLoading,
    error,
    refreshProfiles,
    upsertProfile,
    removeProfile,
    bulkUpsertProfiles,
    isRepoReady: !!repo
  };
}