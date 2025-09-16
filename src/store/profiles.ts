import { create } from 'zustand';

export interface UserAIProfile {
  id: string;
  name: string;
  description: string;
  lang: string;
  tone: string;
  traits: string[];
  attachment_style: 'anxious' | 'avoidant' | 'secure' | 'fearful';
  conflict_style: string;
  emotions_focus: string[];
  needs_focus: string[];
  boundaries_focus: string[];
  verbosity: {
    paragraphs: 'unlimited' | 'concise';
    soft_char_limit: number | null;
    hard_char_limit: number | null;
  };
  question_rate: {
    min: number;
    max: number;
  };
  example_lines: string[];
  safety: {
    ban_phrases: string[];
    escalation: 'remind_safety_protocol' | 'escalate_specialist' | string;
  };
  version: number;
  // v2.1 fields
  ageYears?: number | null; // 13..99
  ageGroup?: 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'senior' | null;
  personalityPreset?: string | null;
  presetSource?: 'preset' | 'custom' | null;
  strictness?: 'lenient' | 'balanced' | 'firm' | string;
}

interface ProfilesStore {
  profiles: UserAIProfile[];
  selectedProfileIds: string[];
  addProfile: (profile: UserAIProfile) => void;
  updateProfile: (id: string, profile: Partial<UserAIProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  initializeMockData: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  setSelectedProfiles: (ids: string[]) => void;
  toggleProfileSelection: (id: string) => void;
  clearSelection: () => void;
  importProfiles: (profiles: UserAIProfile[]) => void;
}

// Mock data
const mockProfiles: UserAIProfile[] = [
  {
    id: "userai.ansiosa-aprobadora.v1",
    name: "Ansiosa Aprobadora",
    description: "Persona que busca constantemente aprobación y evita conflictos",
    lang: "es",
    tone: "empático y comprensivo",
    traits: ["approval-seeking", "conflict-avoidant", "anxious"],
    attachment_style: "anxious",
    conflict_style: "evitativo",
    emotions_focus: ["anxiety", "fear", "insecurity"],
    needs_focus: ["validation", "security", "acceptance"],
    boundaries_focus: ["difficulty-setting", "people-pleasing"],
    verbosity: {
      paragraphs: "unlimited",
      soft_char_limit: 800,
      hard_char_limit: null,
    },
    question_rate: {
      min: 1,
      max: 3,
    },
    example_lines: [
      "¿Estás seguro de que no te molesta?",
      "No quiero ser una carga...",
      "Tal vez no debería haber dicho eso"
    ],
    safety: {
      ban_phrases: ["es culpa tuya", "no sirves"],
      escalation: "remind_safety_protocol",
    },
    // v2.1 defaults with migration
    personalityPreset: 'anxious_dependent',
    presetSource: 'custom',
    version: 1
  },
  {
    id: "userai.evitativo-independiente.v1", 
    name: "Evitativo Independiente",
    description: "Persona que evita la intimidad emocional y valora la autonomía",
    lang: "es",
    tone: "neutral y distante",
    traits: ["independence", "emotional-distance", "self-reliant"],
    attachment_style: "avoidant",
    conflict_style: "retirada",
    emotions_focus: ["detachment", "control", "autonomy"],
    needs_focus: ["independence", "space", "self-sufficiency"],
    boundaries_focus: ["rigid", "protective"],
    verbosity: {
      paragraphs: "concise",
      soft_char_limit: 400,
      hard_char_limit: 600,
    },
    question_rate: {
      min: 0,
      max: 1,
    },
    example_lines: [
      "No necesito ayuda con eso",
      "Prefiero manejarlo yo solo/a",
      "No es tan importante hablar de eso"
    ],
    safety: {
      ban_phrases: ["dependiente", "necesitas ayuda"],
      escalation: "escalate_specialist",
    },
    // v2.1 defaults with migration
    personalityPreset: 'avoidant_distanced',
    presetSource: 'custom',
    version: 1
  },
  {
    id: "userai.reactivo-explosivo.v1",
    name: "Reactivo Explosivo", 
    description: "Persona con tendencia a reacciones emocionales intensas",
    lang: "es",
    tone: "intenso y apasionado",
    traits: ["emotional-reactivity", "impulsive", "passionate"],
    attachment_style: "fearful",
    conflict_style: "escalatorio",
    emotions_focus: ["anger", "frustration", "passion"],
    needs_focus: ["being-heard", "validation", "control"],
    boundaries_focus: ["inconsistent", "emotional"],
    verbosity: {
      paragraphs: "unlimited",
      soft_char_limit: 1200,
      hard_char_limit: null,
    },
    question_rate: {
      min: 2,
      max: 4,
    },
    example_lines: [
      "¡No puedo creer que hayas hecho eso!",
      "Siempre pasa lo mismo",
      "¿Por qué nadie me entiende?"
    ],
    safety: {
      ban_phrases: ["cálmate", "exagerado"],
      escalation: "Recordar que las emociones intensas son válidas",
    },
    // v2.1 defaults with migration
    personalityPreset: 'hurt_distrustful',
    presetSource: 'custom',
    version: 1
  }
];

const STORAGE_KEY = 'userai_profiles';

export const useProfilesStore = create<ProfilesStore>((set, get) => ({
  profiles: [],
  selectedProfileIds: [],
  
  addProfile: (profile) => {
    set((state) => ({ 
      profiles: [...state.profiles, profile] 
    }));
    get().saveToStorage();
  },
  
  updateProfile: (id, updates) => {
    set((state) => ({
      profiles: state.profiles.map(profile =>
        profile.id === id ? { ...profile, ...updates } : profile
      )
    }));
    get().saveToStorage();
  },
  
  deleteProfile: (id) => {
    set((state) => ({
      profiles: state.profiles.filter(profile => profile.id !== id),
      selectedProfileIds: state.selectedProfileIds.filter(selectedId => selectedId !== id)
    }));
    get().saveToStorage();
  },
  
  duplicateProfile: (id) => {
    const state = get();
    const profile = state.profiles.find(p => p.id === id);
    if (profile) {
      const timestamp = Date.now().toString();
      const newProfile = {
        ...profile,
        id: `userai.${profile.name.toLowerCase().replace(/\s+/g, '-')}-copy-${timestamp}.v${profile.version + 1}`,
        name: `${profile.name} (Copia)`,
        version: profile.version + 1,
      };
      set((state) => ({
        profiles: [...state.profiles, newProfile]
      }));
      get().saveToStorage();
      return newProfile.id;
    }
  },
  
  initializeMockData: () => {
    set({ profiles: mockProfiles });
    get().saveToStorage();
  },
  
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const profiles = JSON.parse(stored);
        set({ profiles });
      }
    } catch (error) {
      console.error('Error loading profiles from storage:', error);
    }
  },
  
  saveToStorage: () => {
    try {
      const { profiles } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error saving profiles to storage:', error);
    }
  },

  setSelectedProfiles: (ids) => {
    set({ selectedProfileIds: ids });
  },

  toggleProfileSelection: (id) => {
    set((state) => ({
      selectedProfileIds: state.selectedProfileIds.includes(id)
        ? state.selectedProfileIds.filter(selectedId => selectedId !== id)
        : [...state.selectedProfileIds, id]
    }));
  },

  clearSelection: () => {
    set({ selectedProfileIds: [] });
  },

  importProfiles: (newProfiles) => {
    set((state) => ({
      profiles: [...state.profiles, ...newProfiles]
    }));
    get().saveToStorage();
  },
}));