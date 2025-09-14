import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Knobs, DEFAULT_KNOBS } from '../types/core';
import { encryptData, decryptData } from '../utils/crypto';

export interface SettingsState {
  // OpenAI Configuration (volatile by default)
  apiKey: string | null;
  rememberKey: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  
  // System Configuration (persisted)
  xmlSystemSpec: string;
  knobsBase: Knobs;
  simulationMode: boolean;
  
  // Preflight Settings (persisted)
  estimateCost: boolean;
  abortOnCritical: boolean;
  
  // Dark Mode (persisted)
  darkMode: boolean;
  
  // Actions
  setApiKey: (key: string | null) => void;
  setRememberKey: (remember: boolean) => void;
  setModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setXmlSystemSpec: (xml: string) => void;
  setKnobsBase: (knobs: Partial<Knobs>) => void;
  setSimulationMode: (mode: boolean) => void;
  setEstimateCost: (estimate: boolean) => void;
  setAbortOnCritical: (abort: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  clearSensitiveData: () => void;
  loadEncryptedKey: () => Promise<boolean>;
  saveEncryptedKey: () => Promise<void>;
}

const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<SystemSpec>
  <Role>
    You are Nini, a supportive AI assistant for relationship coaching.
  </Role>
  
  <Flow>
    <Phase name="recap">Acknowledge and reflect what the user shared</Phase>
    <Phase name="questioning">Ask clarifying questions (max 1 per response, max 140 chars)</Phase>
    <Phase name="insight">Provide gentle insight or observation</Phase>
    <Phase name="move">Suggest concrete micro-steps</Phase>
    <Phase name="reflection">Help user reflect on their progress</Phase>
  </Flow>
  
  <Output>
    <MaxLength>900</MaxLength>
    <EmojiPolicy max_per_message="2" safe_set="❤️,🤗,💕,🌟,✨,🙏" />
  </Output>
  
  <Safety>
    <CrisisDetection>
      <Pattern>self_harm</Pattern>
      <Pattern>harm_to_others</Pattern>
      <OnDetect>clarify_before_crisis</OnDetect>
    </CrisisDetection>
  </Safety>
  
  <!-- KnobOverrides -->
</SystemSpec>`;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Volatile state
      apiKey: null,
      rememberKey: false,
      
      // Persisted state
      model: 'gpt-5-2025-08-07',
      temperature: 0.6,
      maxTokens: 768,
      xmlSystemSpec: DEFAULT_XML,
      knobsBase: DEFAULT_KNOBS,
      simulationMode: false,
      estimateCost: true,
      abortOnCritical: false,
      darkMode: false,
      
      // Actions
      setApiKey: (key) => set({ apiKey: key }),
      setRememberKey: (remember) => {
        set({ rememberKey: remember });
        if (!remember) {
          // Clear encrypted key if unchecked
          localStorage.removeItem('nini_encrypted_key');
        }
      },
      setModel: (model) => set({ model }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setXmlSystemSpec: (xmlSystemSpec) => set({ xmlSystemSpec }),
      setKnobsBase: (knobs) => set({ knobsBase: { ...get().knobsBase, ...knobs } }),
      setSimulationMode: (simulationMode) => set({ simulationMode }),
      setEstimateCost: (estimateCost) => set({ estimateCost }),
      setAbortOnCritical: (abortOnCritical) => set({ abortOnCritical }),
      setDarkMode: (darkMode) => {
        set({ darkMode });
        document.documentElement.classList.toggle('dark', darkMode);
      },
      
      clearSensitiveData: () => {
        set({ apiKey: null });
        localStorage.removeItem('nini_encrypted_key');
      },
      
      loadEncryptedKey: async () => {
        try {
          const encrypted = localStorage.getItem('nini_encrypted_key');
          if (!encrypted || !get().rememberKey) return false;
          
          const decrypted = await decryptData(encrypted);
          set({ apiKey: decrypted });
          return true;
        } catch (error) {
          console.error('Failed to load encrypted key:', error);
          return false;
        }
      },
      
      saveEncryptedKey: async () => {
        try {
          const { apiKey, rememberKey } = get();
          if (!apiKey || !rememberKey) return;
          
          const encrypted = await encryptData(apiKey);
          localStorage.setItem('nini_encrypted_key', encrypted);
        } catch (error) {
          console.error('Failed to save encrypted key:', error);
        }
      },
    }),
    {
      name: 'nini-settings',
      partialize: (state) => ({
        // Only persist non-sensitive data
        model: state.model,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        xmlSystemSpec: state.xmlSystemSpec,
        knobsBase: state.knobsBase,
        simulationMode: state.simulationMode,
        estimateCost: state.estimateCost,
        abortOnCritical: state.abortOnCritical,
        darkMode: state.darkMode,
        rememberKey: state.rememberKey,
      }),
    }
  )
);

// Initialize dark mode on load
if (typeof window !== 'undefined') {
  const settings = useSettingsStore.getState();
  document.documentElement.classList.toggle('dark', settings.darkMode);
}