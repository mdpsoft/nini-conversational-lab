// Shim types for scenario field change audit - DO NOT USE IN PRODUCTION CODE

export type RelationshipType =
  | "in_relationship"
  | "dating_undefined"
  | "situationship"
  | "ex"
  | "just_friend"
  | "coworker"
  | "family_member";

export interface ScenarioAuditShim {
  // legacy (to remove in next step)
  attachmentStyle?: string; // @deprecated
  topic?: string;           // will migrate to relationshipType
  // future target (may be absent for now)
  relationshipType?: RelationshipType | null;
  crisisSignals?: string | null;
}

export interface AuditMatch {
  path: string;
  line: number;
  snippet: string;
  category: 'Types' | 'UI' | 'Runtime' | 'Reports' | 'Store' | 'Docs';
  risk: 'Low' | 'Medium' | 'High';
  suggestedAction: string;
}

export interface AuditSummary {
  attachmentStyleRefs: number;
  topicRefs: number;
  relationshipTypeRefs: number;
  breakpoints: number;
  storedScenarios: {
    local: number;
    supabase: number;
    withAttachmentStyle: number;
    withTopic: number;
    withRelationshipType: number;
    withCrisisSignals: number;
  };
}