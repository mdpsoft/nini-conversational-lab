import { z } from "zod";

export type RelationshipType =
  | "in_relationship"        // 🙂 We're in a relationship
  | "dating_undefined"       // 💑 We're dating but it's undefined
  | "situationship"          // 👀 It's a situationship / on-and-off
  | "ex"                     // 💔 It's my ex
  | "just_friend"            // 💘 It's just a friend of mine
  | "coworker"               // 😱 It's a coworker
  | "family_member";         // 💋 It's a member of my family

export interface Scenario {
  id: string;
  name: string;
  relationshipType: RelationshipType | null;  // NEW
  crisisSignals?: string | null;              // KEEP (clarified copy)
  language: "es" | "en";
  goals?: string[];
  seedTurns?: string;
  // legacy removed: attachmentStyle, topic
}

// Schema for validation with backward compatibility
export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  language: z.enum(['es', 'en']),
  relationshipType: z.enum([
    'in_relationship',
    'dating_undefined', 
    'situationship',
    'ex',
    'just_friend',
    'coworker',
    'family_member'
  ]).nullable(),
  crisisSignals: z.string().nullable().optional(),
  goals: z.array(z.string()).optional(),
  seedTurns: z.string().optional(),
  // Legacy fields for migration (will be ignored)
  attachmentStyle: z.any().optional(),
  topic: z.any().optional(),
  attachment_style: z.any().optional(),
  emotional_intensity: z.any().optional(),
  cognitive_noise: z.any().optional(),
  crisis_signals: z.any().optional(),
  constraints: z.any().optional(),
  seed_turns: z.any().optional(),
  success_criteria: z.any().optional(),
});

// Helper functions for UI display
export const getRelationshipTypeLabel = (type: RelationshipType | null): string => {
  if (!type) return "—";
  
  const labels: Record<RelationshipType, string> = {
    "in_relationship": "🙂 We're in a relationship",
    "dating_undefined": "💑 We're dating but it's undefined", 
    "situationship": "👀 It's a situationship / on-and-off",
    "ex": "💔 It's my ex",
    "just_friend": "💘 It's just a friend of mine",
    "coworker": "😱 It's a coworker",
    "family_member": "💋 It's a member of my family"
  };
  
  return labels[type];
};

export const getRelationshipTypeOptions = () => [
  { value: "in_relationship", label: "🙂 We're in a relationship" },
  { value: "dating_undefined", label: "💑 We're dating but it's undefined" },
  { value: "situationship", label: "👀 It's a situationship / on-and-off" },
  { value: "ex", label: "💔 It's my ex" },
  { value: "just_friend", label: "💘 It's just a friend of mine" },
  { value: "coworker", label: "😱 It's a coworker" },
  { value: "family_member", label: "💋 It's a member of my family" }
];