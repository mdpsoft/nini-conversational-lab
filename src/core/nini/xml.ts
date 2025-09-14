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