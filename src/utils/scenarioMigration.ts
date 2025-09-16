import { RelationshipType } from '@/types/scenario';

// Legacy scenario interface for migration
interface LegacyScenario {
  id: string;
  name: string;
  topic?: string;
  attachment_style?: string;
  language?: 'es' | 'en' | 'mix';
  crisis_signals?: 'none' | 'ambiguous' | 'clear';
  [key: string]: any; // Allow other legacy fields
}

// Topic to RelationshipType mapping (case-insensitive, ES/EN support)
const topicMappings: Record<string, RelationshipType> = {
  // English
  "relationship": "in_relationship",
  "couple": "in_relationship", 
  "dating": "dating_undefined",
  "situationship": "situationship",
  "on-and-off": "situationship",
  "ex": "ex",
  "friend": "just_friend",
  "coworker": "coworker",
  "work": "coworker",
  "workplace": "coworker",
  "family": "family_member",
  
  // Spanish
  "pareja": "in_relationship",
  "relacion": "in_relationship",
  "saliendo": "dating_undefined",
  "amigo": "just_friend",
  "compañero": "coworker",
  "trabajo": "coworker",
  "familia": "family_member",
  
  // Mental health topics -> friend (safer default)
  "mental_health": "just_friend",
  "salud_mental": "just_friend"
};

export const mapTopicToRelationshipType = (topic: string | null | undefined): RelationshipType | null => {
  if (!topic || typeof topic !== 'string') return null;
  
  const normalizedTopic = topic.toLowerCase().trim();
  
  // Direct mapping
  if (normalizedTopic in topicMappings) {
    return topicMappings[normalizedTopic];
  }
  
  // Partial matching for compound topics
  for (const [key, value] of Object.entries(topicMappings)) {
    if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
      return value;
    }
  }
  
  // No match found - return null to let user choose manually
  return null;
};

export const migrateLegacyScenario = (legacy: LegacyScenario) => {
  const migrated = {
    id: legacy.id,
    name: legacy.name,
    language: legacy.language === 'mix' ? 'es' : (legacy.language as 'es' | 'en') || 'es',
    relationshipType: mapTopicToRelationshipType(legacy.topic),
    crisisSignals: legacy.crisis_signals && legacy.crisis_signals !== 'none' ? legacy.crisis_signals : null,
    goals: legacy.goals || [],
    seedTurns: Array.isArray(legacy.seed_turns) ? legacy.seed_turns.join('\n') : legacy.seedTurns || ''
  };
  
  return migrated;
};

export const getMigrationStats = (scenarios: LegacyScenario[]) => {
  const stats = {
    total: scenarios.length,
    withTopic: 0,
    withAttachmentStyle: 0,
    topicMapped: 0,
    topicUnmapped: 0,
    withCrisisSignals: 0
  };
  
  scenarios.forEach(scenario => {
    if (scenario.topic) {
      stats.withTopic++;
      if (mapTopicToRelationshipType(scenario.topic)) {
        stats.topicMapped++;
      } else {
        stats.topicUnmapped++;
      }
    }
    
    if (scenario.attachment_style) {
      stats.withAttachmentStyle++;
    }
    
    if (scenario.crisis_signals && scenario.crisis_signals !== 'none') {
      stats.withCrisisSignals++;
    }
  });
  
  return stats;
};