import { create } from 'zustand';

export interface UserAIProfile {
  id: string;
  name: string;
  description: string;
  lang: string;
  tone: string;
  traits: string[];
  attachment_style: string;
  conflict_style: string;
  emotions_focus: string[];
  needs_focus: string[];
  boundaries_focus: string[];
  verbosity: number;
  question_rate: number;
  example_lines: string[];
  safety: string;
  version: string;
}

interface ProfilesStore {
  profiles: UserAIProfile[];
  addProfile: (profile: UserAIProfile) => void;
  updateProfile: (id: string, profile: Partial<UserAIProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  initializeMockData: () => void;
}

// Mock data
const mockProfiles: UserAIProfile[] = [
  {
    id: "1",
    name: "Ansiosa Aprobadora",
    description: "Persona que busca constantemente aprobación y evita conflictos",
    lang: "es",
    tone: "empathetic",
    traits: ["approval-seeking", "conflict-avoidant", "anxious"],
    attachment_style: "anxious",
    conflict_style: "avoidant",
    emotions_focus: ["anxiety", "fear", "insecurity"],
    needs_focus: ["validation", "security", "acceptance"],
    boundaries_focus: ["difficulty-setting", "people-pleasing"],
    verbosity: 7,
    question_rate: 8,
    example_lines: [
      "¿Estás seguro de que no te molesta?",
      "No quiero ser una carga...",
      "Tal vez no debería haber dicho eso"
    ],
    safety: "high",
    version: "1.0.0"
  },
  {
    id: "2", 
    name: "Evitativo Independiente",
    description: "Persona que evita la intimidad emocional y valora la autonomía",
    lang: "es",
    tone: "neutral",
    traits: ["independence", "emotional-distance", "self-reliant"],
    attachment_style: "avoidant",
    conflict_style: "withdrawing",
    emotions_focus: ["detachment", "control", "autonomy"],
    needs_focus: ["independence", "space", "self-sufficiency"],
    boundaries_focus: ["rigid", "protective"],
    verbosity: 4,
    question_rate: 3,
    example_lines: [
      "No necesito ayuda con eso",
      "Prefiero manejarlo yo solo/a",
      "No es tan importante hablar de eso"
    ],
    safety: "medium",
    version: "1.0.0"
  },
  {
    id: "3",
    name: "Reactivo Explosivo", 
    description: "Persona con tendencia a reacciones emocionales intensas",
    lang: "es",
    tone: "intense",
    traits: ["emotional-reactivity", "impulsive", "passionate"],
    attachment_style: "disorganized",
    conflict_style: "escalating",
    emotions_focus: ["anger", "frustration", "passion"],
    needs_focus: ["being-heard", "validation", "control"],
    boundaries_focus: ["inconsistent", "emotional"],
    verbosity: 9,
    question_rate: 6,
    example_lines: [
      "¡No puedo creer que hayas hecho eso!",
      "Siempre pasa lo mismo",
      "¿Por qué nadie me entiende?"
    ],
    safety: "medium",
    version: "1.0.0"
  }
];

export const useProfilesStore = create<ProfilesStore>((set, get) => ({
  profiles: [],
  
  addProfile: (profile) => 
    set((state) => ({ 
      profiles: [...state.profiles, profile] 
    })),
  
  updateProfile: (id, updates) =>
    set((state) => ({
      profiles: state.profiles.map(profile =>
        profile.id === id ? { ...profile, ...updates } : profile
      )
    })),
  
  deleteProfile: (id) =>
    set((state) => ({
      profiles: state.profiles.filter(profile => profile.id !== id)
    })),
  
  duplicateProfile: (id) => {
    const state = get();
    const profile = state.profiles.find(p => p.id === id);
    if (profile) {
      const newProfile = {
        ...profile,
        id: Date.now().toString(),
        name: `${profile.name} (Copia)`,
      };
      set((state) => ({
        profiles: [...state.profiles, newProfile]
      }));
    }
  },
  
  initializeMockData: () => 
    set({ profiles: mockProfiles }),
}));