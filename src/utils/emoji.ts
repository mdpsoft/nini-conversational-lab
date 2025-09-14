// Simple emoji counting utility

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

export function countEmojis(text: string): number {
  const matches = text.match(EMOJI_REGEX);
  return matches ? matches.length : 0;
}

export function extractEmojis(text: string): string[] {
  const matches = text.match(EMOJI_REGEX);
  return matches || [];
}

export function removeEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '').trim();
}

// Safe emoji set as per specification
export const SAFE_EMOJI_SET = ['❤️', '🤗', '💕', '🌟', '✨', '🙏'];

// Forbidden emoji sets
export const FORBIDDEN_EMOJI_SETS = {
  flags: /[\u{1F1E6}-\u{1F1FF}]{2}/gu, // Flag emojis
  explicit: /🍆|🍑|💦|🔥/gu, // Potentially inappropriate
};

export function validateEmojiSet(emojis: string[]): {
  valid: boolean;
  forbidden: string[];
  safe: string[];
} {
  const forbidden: string[] = [];
  const safe: string[] = [];
  
  emojis.forEach((emoji) => {
    if (SAFE_EMOJI_SET.includes(emoji)) {
      safe.push(emoji);
    } else {
      // Check against forbidden sets
      let isForbidden = false;
      Object.values(FORBIDDEN_EMOJI_SETS).forEach((regex) => {
        if (regex.test(emoji)) {
          isForbidden = true;
        }
      });
      
      if (isForbidden) {
        forbidden.push(emoji);
      } else {
        // Emoji not in safe set but not explicitly forbidden
        safe.push(emoji);
      }
    }
  });
  
  return {
    valid: forbidden.length === 0,
    forbidden,
    safe,
  };
}

export function isEmojiAllowedInPhase(emoji: string, phase?: string): boolean {
  // During crisis, only very specific emojis are allowed
  if (phase === 'crisis') {
    return ['🤗', '🙏'].includes(emoji);
  }
  
  // Other phases allow safe set
  return SAFE_EMOJI_SET.includes(emoji);
}
