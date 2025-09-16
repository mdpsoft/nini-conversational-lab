import { AuditMatch } from '@/types/scenario-audit';

interface ScanResult {
  path: string;
  line: number;
  content: string;
  context: string;
}

// Simulate scanning the codebase for patterns
export const scanRepoFor = async (patterns: string[]): Promise<ScanResult[]> => {
  // In a real implementation, this would scan actual files
  // For now, we'll return the search results we found manually
  const results: ScanResult[] = [];
  
  // attachmentStyle references
  const attachmentStyleMatches = [
    // Types & Schemas
    { path: 'src/types/core.ts', line: 65, content: "attachment_style: 'anxious' | 'avoidant' | 'secure';", context: 'interface Scenario' },
    { path: 'src/types/core.ts', line: 211, content: "attachment_style: z.enum(['anxious', 'avoidant', 'secure']),", context: 'ScenarioSchema' },
    
    // UI Components
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 61, content: "attachment_style: \"secure\",", context: 'handleNewScenario' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 326, content: "<Badge variant=\"outline\">{scenario.attachment_style}</Badge>", context: 'TableCell' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 426, content: "<Label>Attachment Style</Label>", context: 'Dialog form' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 428, content: "value={editingScenario.attachment_style}", context: 'Select input' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 431, content: "attachment_style: value", context: 'onChange handler' },
    
    // Runtime Code
    { path: 'src/core/userai/UserAI.ts', line: 408, content: "const attachmentStyle = profile?.attachment_style || scenario.attachment_style;", context: 'generateResponse method' },
    { path: 'src/core/userai/UserAI.ts', line: 420, content: "if (attachmentStyle === 'anxious') {", context: 'response selection logic' },
    { path: 'src/core/userai/UserAI.ts', line: 422, content: "} else if (attachmentStyle === 'avoidant') {", context: 'response selection logic' },
    { path: 'src/core/userai/UserAI.ts', line: 527, content: "private applyAttachmentStyle(text: string): string {", context: 'method signature' },
    { path: 'src/core/userai/UserAI.ts', line: 531, content: "const attachmentStyle = profile?.attachment_style || scenario.attachment_style;", context: 'applyAttachmentStyle method' },
    { path: 'src/core/userai/UserAI.ts', line: 533, content: "if (attachmentStyle === 'anxious') {", context: 'text processing' },
    { path: 'src/core/userai/promptBuilder.ts', line: 73, content: "isSpanish ? `- Estilo de apego: ${profile.attachment_style}` : `- Attachment style: ${profile.attachment_style}`,", context: 'buildUserAIPrompt' },
    
    // Persistence
    { path: 'src/utils/seeds.ts', line: 16, content: "attachment_style: 'secure',", context: 'demo scenario data' },
    { path: 'src/utils/seeds.ts', line: 42, content: "attachment_style: 'anxious',", context: 'demo scenario data' },
    { path: 'src/utils/seeds.ts', line: 69, content: "attachment_style: 'avoidant',", context: 'demo scenario data' },
    { path: 'src/utils/seeds.ts', line: 95, content: "attachment_style: 'anxious',", context: 'demo scenario data' },
    
    // Reports/Debug
    { path: 'src/pages/profiles/CompareProfilesView.tsx', line: 142, content: "attribute: 'Attachment Style',", context: 'comparison table' },
    { path: 'src/pages/profiles/CompareProfilesView.tsx', line: 143, content: "values: profiles.map(p => p.attachment_style),", context: 'comparison values' },
    { path: 'src/pages/profiles/CompareProfilesView.tsx', line: 144, content: "isEqual: new Set(profiles.map(p => p.attachment_style)).size === 1", context: 'equality check' },
  ];
  
  // topic references
  const topicMatches = [
    // Types & Schemas
    { path: 'src/types/core.ts', line: 64, content: "topic: string;", context: 'interface Scenario' },
    { path: 'src/types/core.ts', line: 210, content: "topic: z.string(),", context: 'ScenarioSchema' },
    
    // UI Components  
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 47, content: "scenario.topic.toLowerCase().includes(searchQuery.toLowerCase());", context: 'filteredScenarios' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 60, content: "topic: \"relationship\",", context: 'handleNewScenario' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 293, content: "<TableHead>Topic</TableHead>", context: 'table header' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 313, content: "<TableCell>{scenario.topic}</TableCell>", context: 'table cell' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 392, content: "<Label htmlFor=\"topic\">Topic</Label>", context: 'form label' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 395, content: "value={editingScenario.topic}", context: 'input value' },
    { path: 'src/pages/scenarios/ScenariosPage.tsx', line: 398, content: "topic: e.target.value", context: 'onChange handler' },
    
    // Persistence
    { path: 'src/utils/seeds.ts', line: 15, content: "topic: 'relationship',", context: 'demo scenario data' },
    { path: 'src/utils/seeds.ts', line: 41, content: "topic: 'mental_health',", context: 'demo scenario data' },
    { path: 'src/utils/seeds.ts', line: 68, content: "topic: 'workplace',", context: 'demo scenario data' },
    { path: 'src/utils/seeds.ts', line: 94, content: "topic: 'relationship',", context: 'demo scenario data' },
  ];

  // Combine all matches based on patterns
  if (patterns.some(p => p.includes('attachmentStyle') || p.includes('attachment_style'))) {
    results.push(...attachmentStyleMatches);
  }
  
  if (patterns.some(p => p.includes('topic'))) {
    results.push(...topicMatches);
  }

  return results;
};

export const categorizeMatch = (path: string, content: string): AuditMatch['category'] => {
  if (path.includes('/types/') || path.includes('Schema') || content.includes('interface') || content.includes('z.')) {
    return 'Types';
  }
  if (path.includes('/pages/') || path.includes('/components/') || content.includes('<') || content.includes('jsx')) {
    return 'UI';
  }
  if (path.includes('/core/') || content.includes('generateResponse') || content.includes('applyAttachment')) {
    return 'Runtime';
  }
  if (path.includes('Report') || path.includes('Debug') || path.includes('Compare') || path.includes('Validator')) {
    return 'Reports';
  }
  if (path.includes('/data/') || path.includes('seeds') || path.includes('store') || content.includes('localStorage')) {
    return 'Store';
  }
  return 'Docs';
};

export const assessRisk = (path: string, content: string, context: string): AuditMatch['risk'] => {
  // High risk: direct property access, required in types, switch statements
  if (
    content.includes('!') || // Non-null assertion
    content.includes('z.enum(') || // Required in schema
    content.includes('switch') ||
    content.includes('case') ||
    context.includes('interface') && !content.includes('?') // Required in interface
  ) {
    return 'High';
  }
  
  // Medium risk: optional chaining, form inputs, labels
  if (
    content.includes('?.') ||
    content.includes('??') ||
    content.includes('value=') ||
    content.includes('Label') ||
    content.includes('onChange')
  ) {
    return 'Medium';
  }
  
  // Low risk: comments, docs, seed data
  return 'Low';
};

export const generateSuggestedAction = (path: string, content: string, risk: AuditMatch['risk']): string => {
  if (content.includes('attachment_style') || content.includes('attachmentStyle')) {
    if (path.includes('/types/')) {
      return risk === 'High' 
        ? "Remove attachmentStyle property from interface and schema"
        : "Mark attachmentStyle as optional/deprecated in types";
    }
    if (path.includes('ScenariosPage')) {
      return "Remove attachment style form field and table column";
    }
    if (path.includes('/core/')) {
      return "Remove attachment style logic from UserAI class";
    }
    if (path.includes('seeds')) {
      return "Remove attachment_style from demo scenarios";
    }
    return "Remove attachmentStyle references";
  }
  
  if (content.includes('topic')) {
    if (path.includes('/types/')) {
      return "Replace 'topic: string' with 'relationshipType: RelationshipType | null'";
    }
    if (path.includes('ScenariosPage')) {
      return "Replace topic input with relationshipType dropdown";
    }
    if (path.includes('seeds')) {
      return "Map topic values to relationshipType enum values";
    }
    return "Replace topic references with relationshipType";
  }
  
  return "Review and update as needed";
};