// Response post-processing utilities for USERAI turns
// Handles early closure prevention and question rate enforcement

export interface PostProcessOptions {
  isFinalTurn: boolean;
  lang?: 'es' | 'en';
}

export interface QuestionRate {
  min: number;
  max: number;
}

export interface PostProcessMeta {
  earlyClosureDetected: boolean;
  questionCountBefore: number;
  questionCountAfter: number;
  strategy?: 'cut' | 'append' | 'rewrite';
}

// Early closure patterns (case-insensitive)
const CLOSURE_PATTERNS_ES = [
  /(eso sería todo|con eso estoy|gracias,.*(me sirve|estoy bien)|cerramos|listo|queda así|perfecto, gracias).*$/i,
  /(espero que te sirva|quedo atento|saludos|buen día|buenas noches).*$/i,
  /(eso es todo|ya está|con eso basta|hasta acá llegamos|por ahora es suficiente).*$/i,
];

const CLOSURE_PATTERNS_EN = [
  /(that would be all|that's everything|thanks,.*(that helps|i'm good)|we can close|done|that's it|perfect, thanks).*$/i,
  /(hope that helps|let me know|regards|good day|good night).*$/i,
  /(that's all|that's enough|we can stop here|that should do it).*$/i,
];

// Continuity question templates
const CONTINUITY_QUESTIONS_ES = [
  "¿Qué paso pequeño te ves capaz de intentar ahora mismo?",
  "¿Cuál sería una forma concreta de pedírselo?",
  "¿Qué te gustaría que no vuelva a pasar específicamente?",
  "¿Qué emoción te pega más fuerte cuando eso ocurre?",
  "¿Cómo te imaginas que podría ser diferente la próxima vez?",
];

const CONTINUITY_QUESTIONS_EN = [
  "What small step do you feel capable of trying right now?",
  "What would be a concrete way to ask for that?",
  "What specifically would you like to not happen again?",
  "What emotion hits you strongest when that occurs?",
  "How do you imagine it could be different next time?",
];

/**
 * Prevents early closure by detecting and sanitizing closure patterns
 */
export function sanitizeEarlyClosure(
  text: string, 
  options: PostProcessOptions
): { text: string; meta: Partial<PostProcessMeta> } {
  const { isFinalTurn, lang = 'es' } = options;
  
  // Don't modify final turn
  if (isFinalTurn) {
    return { 
      text, 
      meta: { earlyClosureDetected: false } 
    };
  }

  const patterns = lang === 'en' ? CLOSURE_PATTERNS_EN : CLOSURE_PATTERNS_ES;
  let modifiedText = text;
  let detected = false;
  let strategy: 'cut' | 'append' = 'cut';

  // Check for closure patterns
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      detected = true;
      // Remove the closure pattern
      modifiedText = text.replace(pattern, '').trim();
      
      // If we removed too much, add a continuity question
      if (modifiedText.length < text.length * 0.7) {
        strategy = 'append';
        const questions = lang === 'en' ? CONTINUITY_QUESTIONS_EN : CONTINUITY_QUESTIONS_ES;
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        modifiedText = text.replace(pattern, ` ${randomQuestion}`).trim();
      }
      break;
    }
  }

  return {
    text: modifiedText,
    meta: {
      earlyClosureDetected: detected,
      strategy: detected ? strategy : undefined,
    }
  };
}

/**
 * Soft variant that only adds continuity questions without cutting
 */
export function softSanitizeEarlyClosure(
  text: string,
  options: PostProcessOptions
): { text: string; meta: Partial<PostProcessMeta> } {
  const { isFinalTurn, lang = 'es' } = options;
  
  if (isFinalTurn) {
    return { 
      text, 
      meta: { earlyClosureDetected: false } 
    };
  }

  const patterns = lang === 'en' ? CLOSURE_PATTERNS_EN : CLOSURE_PATTERNS_ES;
  let detected = false;

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      detected = true;
      break;
    }
  }

  if (detected) {
    const questions = lang === 'en' ? CONTINUITY_QUESTIONS_EN : CONTINUITY_QUESTIONS_ES;
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    return {
      text: `${text} ${randomQuestion}`,
      meta: {
        earlyClosureDetected: true,
        strategy: 'append',
      }
    };
  }

  return {
    text,
    meta: { earlyClosureDetected: false }
  };
}

/**
 * Counts real questions in text (excludes questions in quotes/links)
 */
function countQuestions(text: string): number {
  // Remove quoted text and links to avoid counting questions in them
  const cleanText = text
    .replace(/"[^"]*"/g, '')
    .replace(/'[^']*'/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '');
  
  // Count question marks
  return (cleanText.match(/\?/g) || []).length;
}

/**
 * Enforces question rate according to profile settings
 */
export function enforceQuestionRate(
  text: string,
  rate: QuestionRate,
  lang: 'es' | 'en' = 'es'
): { text: string; meta: Partial<PostProcessMeta> } {
  const questionsBefore = countQuestions(text);
  let modifiedText = text;
  let strategy: 'append' | 'rewrite' | undefined;

  // If min is 0, don't force questions
  if (rate.min === 0 && questionsBefore === 0) {
    return {
      text,
      meta: {
        questionCountBefore: questionsBefore,
        questionCountAfter: questionsBefore,
      }
    };
  }

  // Too few questions - add some
  if (questionsBefore < rate.min) {
    strategy = 'append';
    const questionsToAdd = rate.min - questionsBefore;
    const questions = lang === 'en' ? CONTINUITY_QUESTIONS_EN : CONTINUITY_QUESTIONS_ES;
    
    const selectedQuestions = [];
    for (let i = 0; i < questionsToAdd && i < questions.length; i++) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      if (!selectedQuestions.includes(questions[randomIndex])) {
        selectedQuestions.push(questions[randomIndex]);
      }
    }
    
    modifiedText = `${text} ${selectedQuestions.join(' ')}`;
  }
  
  // Too many questions - reduce by converting some to statements
  else if (questionsBefore > rate.max) {
    strategy = 'rewrite';
    const questionsToRemove = questionsBefore - rate.max;
    
    // Simple heuristic: convert last N questions to statements
    let questionCount = 0;
    modifiedText = text.replace(/\?/g, (match, offset) => {
      questionCount++;
      if (questionCount > rate.max) {
        return '.';
      }
      return match;
    });
  }

  const questionsAfter = countQuestions(modifiedText);

  return {
    text: modifiedText,
    meta: {
      questionCountBefore: questionsBefore,
      questionCountAfter: questionsAfter,
      strategy,
    }
  };
}

/**
 * Full post-processing pipeline for USERAI responses
 */
export function postProcessUserAIResponse(
  text: string,
  options: {
    isFinalTurn: boolean;
    questionRate: QuestionRate;
    lang?: 'es' | 'en';
    useSoftClosure?: boolean;
  }
): { text: string; meta: PostProcessMeta } {
  const { isFinalTurn, questionRate, lang = 'es', useSoftClosure = false } = options;
  
  // Step 1: Handle early closure
  const closureResult = useSoftClosure 
    ? softSanitizeEarlyClosure(text, { isFinalTurn, lang })
    : sanitizeEarlyClosure(text, { isFinalTurn, lang });
  
  // Step 2: Enforce question rate
  const questionResult = enforceQuestionRate(closureResult.text, questionRate, lang);
  
  // Combine metadata
  const combinedMeta: PostProcessMeta = {
    earlyClosureDetected: closureResult.meta.earlyClosureDetected || false,
    questionCountBefore: questionResult.meta.questionCountBefore || 0,
    questionCountAfter: questionResult.meta.questionCountAfter || 0,
    strategy: closureResult.meta.strategy || questionResult.meta.strategy,
  };
  
  return {
    text: questionResult.text,
    meta: combinedMeta,
  };
}