export interface TranscriptTurn {
  turn: number;
  speaker: 'Nini' | 'USERAI';
  text: string;
}

export interface MemoryExtractionOptions {
  maxFacts?: number;
  lang?: string;
  usePerplexityFallback?: boolean;
  perplexityApiKey?: string;
}

export interface ShortMemory {
  facts: string[];
  extractionMethod: 'heuristic' | 'llm' | 'hybrid';
  debugInfo?: {
    heuristicFacts: number;
    llmFacts: number;
    sanitizedCount: number;
  };
}

// Priority keywords for fact extraction
const FACT_PATTERNS = {
  decisions: {
    es: [/voy a\s+(.+)/i, /decidí\s+(.+)/i, /eligió?\s+(.+)/i, /haré\s+(.+)/i],
    en: [/i will\s+(.+)/i, /decided to\s+(.+)/i, /chose to\s+(.+)/i, /going to\s+(.+)/i]
  },
  obstacles: {
    es: [/no responde/i, /miedo a\s+(.+)/i, /me cuesta\s+(.+)/i, /dificultad para\s+(.+)/i, /bloqueo/i],
    en: [/doesn't respond/i, /afraid of\s+(.+)/i, /hard to\s+(.+)/i, /difficulty with\s+(.+)/i, /blocked/i]
  },
  needs: {
    es: [/necesito\s+(.+)/i, /requiero\s+(.+)/i, /me hace falta\s+(.+)/i, /busco\s+(.+)/i],
    en: [/need\s+(.+)/i, /require\s+(.+)/i, /looking for\s+(.+)/i, /want\s+(.+)/i]
  },
  boundaries: {
    es: [/no quiero\s+(.+)/i, /límite/i, /no acepto\s+(.+)/i, /rechazo\s+(.+)/i],
    en: [/don't want\s+(.+)/i, /boundary/i, /won't accept\s+(.+)/i, /refuse to\s+(.+)/i]
  },
  emotions: {
    es: [/me siento\s+(.+)/i, /siento\s+(.+)/i, /emoción/i, /ansiedad/i, /frustración/i, /tristeza/i, /enojo/i],
    en: [/feel\s+(.+)/i, /feeling\s+(.+)/i, /emotion/i, /anxiety/i, /frustration/i, /sadness/i, /anger/i]
  }
};

// Sensitive content patterns to sanitize
const SENSITIVE_PATTERNS = {
  es: [
    /suicid|suicida/i,
    /lastimar|daño|herir/i,
    /matar|muerte/i,
    /autolesión/i
  ],
  en: [
    /suicide|suicidal/i,
    /hurt|harm|injure/i,
    /kill|death|die/i,
    /self-harm/i
  ]
};

export async function extractShortMemory(
  transcript: TranscriptTurn[], 
  options: MemoryExtractionOptions = {}
): Promise<ShortMemory> {
  const { 
    maxFacts = 5, 
    lang = 'es', 
    usePerplexityFallback = false,
    perplexityApiKey 
  } = options;

  let facts: string[] = [];
  let heuristicFacts = 0;
  let llmFacts = 0;
  let sanitizedCount = 0;

  // Step 1: Heuristic extraction
  const heuristicResults = extractFactsHeuristic(transcript, lang, maxFacts);
  facts = heuristicResults.facts;
  heuristicFacts = facts.length;
  sanitizedCount = heuristicResults.sanitizedCount;

  // Step 2: LLM fallback if not enough facts and Perplexity is available
  if (facts.length < maxFacts && usePerplexityFallback && perplexityApiKey) {
    try {
      const llmResults = await extractFactsWithLLM(transcript, lang, maxFacts - facts.length, perplexityApiKey);
      facts.push(...llmResults.facts);
      llmFacts = llmResults.facts.length;
      sanitizedCount += llmResults.sanitizedCount;
    } catch (error) {
      console.warn('LLM fallback failed:', error);
    }
  }

  return {
    facts: facts.slice(0, maxFacts),
    extractionMethod: llmFacts > 0 ? 'hybrid' : 'heuristic',
    debugInfo: {
      heuristicFacts,
      llmFacts,
      sanitizedCount
    }
  };
}

function extractFactsHeuristic(transcript: TranscriptTurn[], lang: string, maxFacts: number): { facts: string[]; sanitizedCount: number } {
  const facts: string[] = [];
  const priorities = ['decisions', 'obstacles', 'needs', 'boundaries', 'emotions'] as const;
  let sanitizedCount = 0;

  // Process transcript in reverse (most recent first)
  const recentTurns = transcript.slice(-8); // Last 8 turns for context

  for (const priority of priorities) {
    if (facts.length >= maxFacts) break;

    const patterns = FACT_PATTERNS[priority][lang as keyof typeof FACT_PATTERNS.decisions];
    
    for (const turn of recentTurns) {
      if (facts.length >= maxFacts) break;

      for (const pattern of patterns) {
        const match = turn.text.match(pattern);
        if (match) {
          let fact = '';
          
          switch (priority) {
            case 'decisions':
              fact = lang === 'es' 
                ? `Decidió: ${match[1]?.trim() || turn.text.slice(0, 50)}`
                : `Decided: ${match[1]?.trim() || turn.text.slice(0, 50)}`;
              break;
            case 'obstacles':
              fact = lang === 'es'
                ? `Obstáculo: ${match[1]?.trim() || 'bloqueo identificado'}`
                : `Obstacle: ${match[1]?.trim() || 'block identified'}`;
              break;
            case 'needs':
              fact = lang === 'es'
                ? `Necesita: ${match[1]?.trim()}`
                : `Needs: ${match[1]?.trim()}`;
              break;
            case 'boundaries':
              fact = lang === 'es'
                ? `Límite: ${match[1]?.trim() || 'límite establecido'}`
                : `Boundary: ${match[1]?.trim() || 'boundary set'}`;
              break;
            case 'emotions':
              fact = lang === 'es'
                ? `Siente: ${match[1]?.trim() || 'emoción intensa'}`
                : `Feels: ${match[1]?.trim() || 'intense emotion'}`;
              break;
          }

          // Sanitize sensitive content
          const sanitized = sanitizeFact(fact, lang);
          if (sanitized.wasSanitized) {
            sanitizedCount++;
          }

          if (sanitized.fact && !facts.includes(sanitized.fact)) {
            facts.push(sanitized.fact);
            break; // One fact per pattern match
          }
        }
      }
    }
  }

  return { facts, sanitizedCount };
}

async function extractFactsWithLLM(
  transcript: TranscriptTurn[], 
  lang: string, 
  needed: number,
  apiKey: string
): Promise<{ facts: string[]; sanitizedCount: number }> {
  const recentTurns = transcript.slice(-6);
  const conversationText = recentTurns
    .map(turn => `${turn.speaker}: ${turn.text}`)
    .join('\n');

  const systemPrompt = lang === 'es' 
    ? `Extrae ${needed} hechos relevantes de esta conversación. Formato: una línea por hecho, enfócate en decisiones, obstáculos, necesidades, límites o emociones clave. Sé específico y concreto.`
    : `Extract ${needed} relevant facts from this conversation. Format: one line per fact, focus on decisions, obstacles, needs, boundaries or key emotions. Be specific and concrete.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversationText }
        ],
        temperature: 0.2,
        max_tokens: 300,
        return_images: false,
        return_related_questions: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const rawFacts = content.split('\n')
      .filter((line: string) => line.trim())
      .slice(0, needed);

    let sanitizedCount = 0;
    const facts = rawFacts.map((fact: string) => {
      const sanitized = sanitizeFact(fact.trim(), lang);
      if (sanitized.wasSanitized) sanitizedCount++;
      return sanitized.fact;
    }).filter(Boolean);

    return { facts, sanitizedCount };
  } catch (error) {
    console.error('LLM extraction failed:', error);
    return { facts: [], sanitizedCount: 0 };
  }
}

function sanitizeFact(fact: string, lang: string): { fact: string; wasSanitized: boolean } {
  const patterns = SENSITIVE_PATTERNS[lang as keyof typeof SENSITIVE_PATTERNS];
  let sanitized = fact;
  let wasSanitized = false;

  for (const pattern of patterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[seguro]');
      wasSanitized = true;
    }
  }

  // Ensure fact is not too long
  if (sanitized.length > 80) {
    sanitized = sanitized.slice(0, 77) + '...';
  }

  return { fact: sanitized, wasSanitized };
}