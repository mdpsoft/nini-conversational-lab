import { UserAIProfile } from '@/store/profiles';

export function createEmptyProfile(lang: 'es' | 'en' = 'es'): UserAIProfile {
  const now = new Date().toISOString();
  const id = `userai.new-profile-${Date.now()}.v1`;
  
  return {
    id,
    name: '',
    description: '',
    lang,
    tone: null,  // Use null instead of empty string
    traits: [],
    attachment_style: 'secure',
    conflict_style: null,  // Use null instead of empty string
    emotions_focus: [],
    needs_focus: [],
    boundaries_focus: [],
    verbosity: {
      paragraphs: 'unlimited',
      soft_char_limit: 1000,
      hard_char_limit: null,
    },
    question_rate: {
      min: 0,
      max: 2,
    },
    example_lines: [],
    safety: {
      ban_phrases: [],
      escalation: 'remind_safety_protocol',
    },
    version: 1,
    // v2.1 fields with safe defaults
    ageYears: undefined,
    ageGroup: null,
    personalityPreset: null,
    strictness: 'balanced',
    presetSource: 'custom',
  };
}