import { UserAIProfile } from '@/store/profiles';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { isGuestModeEnabled } from '@/hooks/useGuestMode';

export interface ProfilesRepo {
  list(): Promise<UserAIProfile[]>;
  get(id: string): Promise<UserAIProfile | null>;
  upsert(profile: UserAIProfile): Promise<void>;
  remove(id: string): Promise<void>;
  bulkUpsert(profiles: UserAIProfile[]): Promise<void>;
}

export type DataSource = 'Supabase' | 'Local';

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

// Supabase implementation
export class SupabaseProfilesRepo implements ProfilesRepo {
  async list(): Promise<UserAIProfile[]> {
    const { data: profiles, error } = await (supabase as any)
      .from('userai_profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.message.includes("Could not find the table 'public.userai_profiles'") || 
          error.code === 'PGRST106') {
        throw new SchemaError(`Table 'public.userai_profiles' not found`);
      }
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    return profiles?.map(this.mapFromSupabase) || [];
  }

  async get(id: string): Promise<UserAIProfile | null> {
    const { data: profile, error } = await (supabase as any)
      .from('userai_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.message.includes("Could not find the table 'public.userai_profiles'") || 
          error.code === 'PGRST106') {
        throw new SchemaError(`Table 'public.userai_profiles' not found`);
      }
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return profile ? this.mapFromSupabase(profile) : null;
  }

  async upsert(profile: UserAIProfile): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }

    const supabaseProfile = this.mapToSupabase(profile, userData.user.id);

    const { error } = await (supabase as any)
      .from('userai_profiles')
      .upsert(supabaseProfile);

    if (error) {
      if (error.message.includes("Could not find the table 'public.userai_profiles'") || 
          error.code === 'PGRST106') {
        throw new SchemaError(`Table 'public.userai_profiles' not found`);
      }
      throw new Error(`Failed to save profile: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('userai_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.message.includes("Could not find the table 'public.userai_profiles'") || 
          error.code === 'PGRST106') {
        throw new SchemaError(`Table 'public.userai_profiles' not found`);
      }
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }

  async bulkUpsert(profiles: UserAIProfile[]): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }

    const supabaseProfiles = profiles.map(p => this.mapToSupabase(p, userData.user!.id));

    const { error } = await (supabase as any)
      .from('userai_profiles')
      .upsert(supabaseProfiles);

    if (error) {
      if (error.message.includes("Could not find the table 'public.userai_profiles'") || 
          error.code === 'PGRST106') {
        throw new SchemaError(`Table 'public.userai_profiles' not found`);
      }
      throw new Error(`Failed to bulk save profiles: ${error.message}`);
    }
  }

  private mapFromSupabase(row: any): UserAIProfile {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      lang: row.lang || 'es',
      tone: row.tone,
      traits: row.traits || [],
      attachment_style: row.attachment_style || 'secure',
      conflict_style: row.conflict_style || '',
      emotions_focus: row.emotions_focus || [],
      needs_focus: row.needs_focus || [],
      boundaries_focus: row.boundaries_focus || [],
      verbosity: row.verbosity || {
        paragraphs: 'unlimited',
        soft_char_limit: 1000,
        hard_char_limit: null,
      },
      question_rate: row.question_rate || { min: 0, max: 2 },
      example_lines: row.example_lines || [],
      safety: row.safety || {
        ban_phrases: [],
        escalation: 'remind_safety_protocol',
      },
      version: row.version || 1,
      // v2.1 fields
      ageYears: row.age_years || null,
      ageGroup: row.age_group || null,
      personalityPreset: row.personality_preset || null,
      presetSource: row.preset_source || null,
      strictness: row.strictness || 'balanced',
    };
  }

  private mapToSupabase(profile: UserAIProfile, ownerId: string) {
    return {
      id: profile.id,
      owner: ownerId,
      name: profile.name,
      description: profile.description,
      lang: profile.lang,
      tone: profile.tone,
      traits: profile.traits,
      attachment_style: profile.attachment_style,
      conflict_style: profile.conflict_style,
      emotions_focus: profile.emotions_focus,
      needs_focus: profile.needs_focus,
      boundaries_focus: profile.boundaries_focus,
      verbosity: profile.verbosity,
      question_rate: profile.question_rate,
      example_lines: profile.example_lines,
      safety: profile.safety,
      version: profile.version,
      // v2.1 fields
      age_years: profile.ageYears || null,
      age_group: profile.ageGroup || null,
      personality_preset: profile.personalityPreset || null,
      preset_source: profile.presetSource || null,
      strictness: profile.strictness || 'balanced',
      updated_at: new Date().toISOString(),
    };
  }
}

// Local storage implementation
export class LocalProfilesRepo implements ProfilesRepo {
  private readonly STORAGE_KEY = 'userai_profiles';

  async list(): Promise<UserAIProfile[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading profiles from localStorage:', error);
      return [];
    }
  }

  async get(id: string): Promise<UserAIProfile | null> {
    const profiles = await this.list();
    return profiles.find(p => p.id === id) || null;
  }

  async upsert(profile: UserAIProfile): Promise<void> {
    const profiles = await this.list();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }
    
    this.saveToStorage(profiles);
  }

  async remove(id: string): Promise<void> {
    const profiles = await this.list();
    const filtered = profiles.filter(p => p.id !== id);
    this.saveToStorage(filtered);
  }

  async bulkUpsert(newProfiles: UserAIProfile[]): Promise<void> {
    const existingProfiles = await this.list();
    const profileMap = new Map(existingProfiles.map(p => [p.id, p]));
    
    // Update or add new profiles
    newProfiles.forEach(profile => {
      profileMap.set(profile.id, profile);
    });
    
    this.saveToStorage(Array.from(profileMap.values()));
  }

  private saveToStorage(profiles: UserAIProfile[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error saving profiles to localStorage:', error);
      throw new Error('Failed to save profiles to local storage');
    }
  }
}

// Repository resolver
export function resolveProfilesRepo(): { repo: ProfilesRepo; source: DataSource } {
  // If guest mode is enabled, always use local storage
  if (isGuestModeEnabled()) {
    return { repo: new LocalProfilesRepo(), source: 'Local' as DataSource };
  }

  // Temporary sync version for immediate use
  try {
    // Simple heuristic: if there's a session in sessionStorage, assume Supabase
    const hasSession = localStorage.getItem('sb-rxufqnsliggxavpfckft-auth-token');
    if (hasSession) {
      return { repo: new SupabaseProfilesRepo(), source: 'Supabase' as DataSource };
    }
  } catch {}
  
  return { repo: new LocalProfilesRepo(), source: 'Local' as DataSource };
}

// Async version of resolver
export async function resolveProfilesRepoAsync(): Promise<{ repo: ProfilesRepo; source: DataSource }> {
  // If guest mode is enabled, always use local storage
  if (isGuestModeEnabled()) {
    return { repo: new LocalProfilesRepo(), source: 'Local' };
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return { repo: new SupabaseProfilesRepo(), source: 'Supabase' };
    }
  } catch (error) {
    console.warn('Failed to check Supabase auth status:', error);
  }
  
  return { repo: new LocalProfilesRepo(), source: 'Local' };
}