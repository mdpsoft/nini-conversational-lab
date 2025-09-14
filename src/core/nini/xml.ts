import { Knobs } from '../../types/core';

// XML parsing and manipulation utilities

export function insertKnobsIntoXml(xmlSystemSpec: string, knobs: Partial<Knobs>): string {
  try {
    // Create the knobs JSON block
    const knobsJson = JSON.stringify(knobs, null, 2);
    const knobsBlock = `<!-- KnobOverrides -->\n<KnobOverrides><![CDATA[\n${knobsJson}\n]]></KnobOverrides>`;
    
    // Check if KnobOverrides already exists
    const existingKnobsRegex = /<!-- KnobOverrides -->[\s\S]*?<\/KnobOverrides>/;
    const placeholderRegex = /<!-- KnobOverrides -->/;
    
    if (existingKnobsRegex.test(xmlSystemSpec)) {
      // Replace existing KnobOverrides block
      return xmlSystemSpec.replace(existingKnobsRegex, knobsBlock);
    } else if (placeholderRegex.test(xmlSystemSpec)) {
      // Replace placeholder comment
      return xmlSystemSpec.replace(placeholderRegex, knobsBlock);
    } else {
      // Insert before closing SystemSpec tag
      const closingTagRegex = /<\/SystemSpec>/;
      if (closingTagRegex.test(xmlSystemSpec)) {
        return xmlSystemSpec.replace(closingTagRegex, `\n  ${knobsBlock}\n</SystemSpec>`);
      } else {
        // Append at the end if no closing tag found
        return xmlSystemSpec + '\n' + knobsBlock;
      }
    }
  } catch (error) {
    console.error('Error inserting knobs into XML:', error);
    return xmlSystemSpec;
  }
}

export function validateXmlSyntax(xml: string): { valid: boolean; error?: string } {
  try {
    // Basic XML validation using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    
    // Check for parsing errors
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      return {
        valid: false,
        error: errorNode.textContent || 'Invalid XML syntax',
      };
    }
    
    // Check for required root element
    if (!doc.documentElement || doc.documentElement.tagName !== 'SystemSpec') {
      return {
        valid: false,
        error: 'XML must have <SystemSpec> as root element',
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'XML validation failed',
    };
  }
}

export function extractXmlSection(xml: string, sectionName: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    
    const section = doc.querySelector(sectionName);
    return section ? section.textContent || '' : null;
  } catch {
    return null;
  }
}

export function getXmlElementAttribute(xml: string, elementName: string, attributeName: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    
    const element = doc.querySelector(elementName);
    return element ? element.getAttribute(attributeName) : null;
  } catch {
    return null;
  }
}

// Extract max_chars_per_message from XML MaxLength element
export function extractMaxLengthFromXml(xml: string): number {
  try {
    const maxLength = extractXmlSection(xml, 'MaxLength');
    return maxLength ? parseInt(maxLength, 10) : 900; // Default fallback
  } catch {
    return 900;
  }
}

// Extract emoji policy from XML
export interface EmojiPolicy {
  max_per_message: number;
  safe_set: string[];
  forbid_in_phases: string[];
}

export function extractEmojiPolicyFromXml(xml: string): EmojiPolicy {
  try {
    const maxPerMessage = getXmlElementAttribute(xml, 'EmojiPolicy', 'max_per_message');
    const safeSet = getXmlElementAttribute(xml, 'EmojiPolicy', 'safe_set');
    const forbidInPhases = getXmlElementAttribute(xml, 'EmojiPolicy', 'forbid_in_phases');
    
    return {
      max_per_message: maxPerMessage ? parseInt(maxPerMessage, 10) : 2,
      safe_set: safeSet ? safeSet.split(',') : ['❤️', '🤗', '💕', '🌟', '✨', '🙏'],
      forbid_in_phases: forbidInPhases ? forbidInPhases.split(',') : ['crisis'],
    };
  } catch {
    return {
      max_per_message: 2,
      safe_set: ['❤️', '🤗', '💕', '🌟', '✨', '🙏'],
      forbid_in_phases: ['crisis'],
    };
  }
}

// Extract knobs from XML <Knobs> element (supports <Knob key="..." value="..."/> and legacy attributes)
export function extractKnobsFromXml(xml: string): Partial<Knobs> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const knobs: Partial<Knobs> = {};

    // Prefer child <Knob> items inside <Knobs>
    const knobItems = Array.from(doc.querySelectorAll('Knobs > Knob'));
    const numericKeys = [
      'empathy', 'mirroring_intensity', 'humor', 'probing_rate',
      'uncertainty_threshold', 'clarification_threshold', 'bias_confirmation_soft',
      'directiveness', 'gentleness', 'colloquiality', 'emoji_bias'
    ];
    const integerKeys = ['ask_rate_min_turns', 'ask_rate_max_turns', 'max_chars_per_message'];

    if (knobItems.length > 0) {
      knobItems.forEach((el) => {
        const key = (el.getAttribute('key') || '').trim();
        const raw = (el.getAttribute('value') || '').trim();
        if (!key || raw === '') return;

        if (key === 'crisis_mode_enabled') {
          knobs.crisis_mode_enabled = /^true$/i.test(raw) || raw === '1';
          return;
        }
        if (integerKeys.includes(key)) {
          const n = parseInt(raw, 10);
          if (!isNaN(n)) (knobs as any)[key] = Math.max(0, n);
          return;
        }
        if (numericKeys.includes(key)) {
          const f = parseFloat(raw);
          if (!isNaN(f)) (knobs as any)[key] = Math.max(0, Math.min(1, f));
        }
      });
      return knobs;
    }

    // Backward compatibility: <Knobs empathy="0.8" ...>
    const knobsElement = doc.querySelector('Knobs');
    if (!knobsElement) {
      return {};
    }

    // Extract numeric values [0..1]
    numericKeys.forEach((knob) => {
      const attr = knobsElement.getAttribute(knob);
      if (attr !== null) {
        const value = parseFloat(attr);
        if (!isNaN(value)) {
          (knobs as any)[knob] = Math.max(0, Math.min(1, value));
        }
      }
    });

    // Extract integer values
    integerKeys.forEach((knob) => {
      const attr = knobsElement.getAttribute(knob);
      if (attr !== null) {
        const value = parseInt(attr, 10);
        if (!isNaN(value)) {
          (knobs as any)[knob] = Math.max(0, value);
        }
      }
    });

    // Extract boolean value
    const crisisMode = knobsElement.getAttribute('crisis_mode_enabled');
    if (crisisMode !== null) {
      knobs.crisis_mode_enabled = crisisMode === 'true' || crisisMode === '1';
    }

    return knobs;
  } catch (error) {
    console.error('Error extracting knobs from XML:', error);
    return {};
  }
}

// Create a minimal XML template
export function createMinimalXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SystemSpec>
  <Role>You are Nini, a supportive AI assistant.</Role>
  
  <Flow>
    <Phase name="recap">Acknowledge what the user shared</Phase>
    <Phase name="questioning">Ask clarifying questions</Phase>
    <Phase name="insight">Provide gentle insights</Phase>
    <Phase name="move">Suggest concrete steps</Phase>
  </Flow>
  
  <Output>
    <MaxLength>900</MaxLength>
    <EmojiPolicy max_per_message="2" safe_set="❤️,🤗,💕,🌟,✨,🙏" forbid_in_phases="crisis" />
  </Output>
  
  <Safety>
    <CrisisDetection>
      <Pattern type="self_harm">thoughts of self-harm</Pattern>
      <OnDetect>clarify_before_crisis</OnDetect>
    </CrisisDetection>
  </Safety>
  
  <!-- KnobOverrides -->
</SystemSpec>`;
}

// Convert legacy <empathy>0.8</empathy> style into
// <Knobs>\n  <Knob key="empathy" value="0.8"/>\n</Knobs>
// Keeps the rest of the XML intact as much as possible
export function convertLegacyKnobsToStandard(xmlSystemSpec: string): string {
  try {
    let xml = xmlSystemSpec;

    const numericKeys = [
      'empathy', 'mirroring_intensity', 'humor', 'probing_rate',
      'uncertainty_threshold', 'clarification_threshold', 'bias_confirmation_soft',
      'directiveness', 'gentleness', 'colloquiality', 'emoji_bias'
    ];
    const integerKeys = ['ask_rate_min_turns', 'ask_rate_max_turns', 'max_chars_per_message'];
    const booleanKeys = ['crisis_mode_enabled'];
    const allKeys = [...numericKeys, ...integerKeys, ...booleanKeys];

    const values: Record<string, number | boolean> = {};

    // Remove legacy elements and collect values
    allKeys.forEach((key) => {
      const re = new RegExp(`<${key}>\\s*([\\s\\S]*?)\\s*<\\/${key}>`, 'gi');
      xml = xml.replace(re, (_m, group1) => {
        const raw = String(group1).trim();
        if (booleanKeys.includes(key)) {
          values[key] = /^true$/i.test(raw) || raw === '1';
        } else if (integerKeys.includes(key)) {
          const n = parseInt(raw, 10);
          if (!isNaN(n)) values[key] = Math.max(0, n);
        } else {
          const f = parseFloat(raw);
          if (!isNaN(f)) values[key] = Math.max(0, Math.min(1, f));
        }
        return '';
      });
    });

    // Build standardized Knobs block
    const knobLines = Object.entries(values).map(([k, v]) => {
      const valStr = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
      return `  <Knob key="${k}" value="${valStr}"/>`;
    });
    const knobsBlock = `<Knobs>\n${knobLines.join('\n')}\n</Knobs>`;

    // Replace existing <Knobs> block if present
    const existingKnobsRegex = /<Knobs>[\s\S]*?<\/Knobs>/i;
    if (existingKnobsRegex.test(xml)) {
      xml = xml.replace(existingKnobsRegex, knobsBlock);
    } else {
      // Insert before </SystemSpec> when possible
      const closingTagRegex = /<\/SystemSpec>/i;
      if (closingTagRegex.test(xml)) {
        xml = xml.replace(closingTagRegex, `${knobsBlock}\n</SystemSpec>`);
      } else {
        xml = `${xml}\n${knobsBlock}`;
      }
    }

    return xml;
  } catch (error) {
    console.error('Error converting legacy knobs to standard:', error);
    return xmlSystemSpec;
  }
}