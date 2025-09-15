export type BeatName = 'setup' | 'incident' | 'tension' | 'midpoint' | 'obstacle' | 'progress' | 'preclose' | 'close';

export interface Beat {
  name: BeatName;
  index: number;
  total: number;
}

// Probability multiplier interface (0.5 = half as likely, 2.0 = twice as likely)
export type ProfileBeatBias = Partial<Record<BeatName, number>>;

// Default beat sequence for story structure
const DEFAULT_BEAT_SEQUENCE: BeatName[] = [
  'setup', 'incident', 'tension', 'midpoint', 'obstacle', 'progress', 'preclose', 'close'
];

// Beat name translations for UI
export const BEAT_TRANSLATIONS = {
  'setup': { es: 'setup', en: 'setup' },
  'incident': { es: 'incidente', en: 'incident' },
  'tension': { es: 'tensión', en: 'tension' },
  'midpoint': { es: 'punto medio', en: 'midpoint' },
  'obstacle': { es: 'obstáculo', en: 'obstacle' },
  'progress': { es: 'progreso', en: 'progress' },
  'preclose': { es: 'pre-cierre', en: 'preclose' },
  'close': { es: 'cierre', en: 'close' }
};

export function pickBeatForTurn(
  turnIndex: number, 
  maxTurns: number, 
  profileBeatBias?: ProfileBeatBias
): Beat {
  // Ensure valid inputs
  const actualTurnIndex = Math.max(0, Math.min(turnIndex, maxTurns - 1));
  const actualMaxTurns = Math.max(1, maxTurns);

  // Guaranteed constraints
  if (actualTurnIndex === 0) {
    return { name: 'setup', index: 1, total: actualMaxTurns };
  }
  
  if (actualTurnIndex === actualMaxTurns - 1) {
    return { name: 'close', index: actualMaxTurns, total: actualMaxTurns };
  }

  // Handle different conversation lengths
  const beatSequence = generateBeatSequence(actualMaxTurns, profileBeatBias);
  const beatName = beatSequence[actualTurnIndex] || 'tension'; // Fallback

  return {
    name: beatName,
    index: actualTurnIndex + 1,
    total: actualMaxTurns
  };
}

function generateBeatSequence(maxTurns: number, profileBeatBias?: ProfileBeatBias): BeatName[] {
  const sequence: BeatName[] = new Array(maxTurns);
  
  // Always set first and last
  sequence[0] = 'setup';
  sequence[maxTurns - 1] = 'close';

  if (maxTurns <= 2) {
    return sequence;
  }

  // Add preclose if enough turns
  if (maxTurns >= 3) {
    sequence[maxTurns - 2] = 'preclose';
  }

  // Fill middle beats based on conversation length
  if (maxTurns === 3) {
    // Just setup -> preclose -> close
    return sequence;
  } else if (maxTurns <= 6) {
    // Compressed sequence: skip some beats, fuse others
    return fillCompressedSequence(sequence, maxTurns, profileBeatBias);
  } else if (maxTurns <= 10) {
    // Standard sequence with some extension
    return fillStandardSequence(sequence, maxTurns, profileBeatBias);
  } else {
    // Extended sequence: stretch tension and progress beats
    return fillExtendedSequence(sequence, maxTurns, profileBeatBias);
  }
}

function fillCompressedSequence(sequence: BeatName[], maxTurns: number, profileBeatBias?: ProfileBeatBias): BeatName[] {
  const availableSlots = maxTurns - 2; // Excluding setup and close
  const hasPreclose = maxTurns >= 3;
  const middleSlots = hasPreclose ? availableSlots - 1 : availableSlots;

  if (middleSlots <= 0) return sequence;

  // Compressed beat priority: incident -> tension -> obstacle -> progress
  const compressedBeats: BeatName[] = ['incident', 'tension', 'obstacle', 'progress'];
  const selectedBeats = selectBeatsWithBias(compressedBeats, middleSlots, profileBeatBias);

  let slotIndex = 1; // Start after setup
  for (const beat of selectedBeats) {
    if (slotIndex < (hasPreclose ? maxTurns - 2 : maxTurns - 1)) {
      sequence[slotIndex] = beat;
      slotIndex++;
    }
  }

  return sequence;
}

function fillStandardSequence(sequence: BeatName[], maxTurns: number, profileBeatBias?: ProfileBeatBias): BeatName[] {
  const availableSlots = maxTurns - 3; // setup, preclose, close
  if (availableSlots <= 0) return sequence;

  // Standard sequence without setup, preclose, close
  const standardBeats: BeatName[] = ['incident', 'tension', 'midpoint', 'obstacle', 'progress'];
  
  // Map beats to slots proportionally
  const beatsToUse = distributeBeatsProportionally(standardBeats, availableSlots, profileBeatBias);

  let slotIndex = 1; // Start after setup
  for (const beat of beatsToUse) {
    if (slotIndex < maxTurns - 2) { // Leave space for preclose and close
      sequence[slotIndex] = beat;
      slotIndex++;
    }
  }

  return sequence;
}

function fillExtendedSequence(sequence: BeatName[], maxTurns: number, profileBeatBias?: ProfileBeatBias): BeatName[] {
  const availableSlots = maxTurns - 3; // setup, preclose, close
  if (availableSlots <= 0) return sequence;

  // Extended beats with repetition for tension and progress
  const extendedBeats: BeatName[] = [
    'incident', 'tension', 'tension', 'midpoint', 'obstacle', 'obstacle', 'progress', 'progress'
  ];

  // Apply bias and select appropriate number of beats
  const selectedBeats = selectBeatsWithBias(extendedBeats, availableSlots, profileBeatBias);

  let slotIndex = 1; // Start after setup
  for (const beat of selectedBeats) {
    if (slotIndex < maxTurns - 2) { // Leave space for preclose and close
      sequence[slotIndex] = beat;
      slotIndex++;
    }
  }

  return sequence;
}

function selectBeatsWithBias(
  availableBeats: BeatName[], 
  slotsNeeded: number, 
  profileBeatBias?: ProfileBeatBias
): BeatName[] {
  if (!profileBeatBias) {
    return availableBeats.slice(0, slotsNeeded);
  }

  // Apply bias by creating weighted selection
  const weightedBeats: BeatName[] = [];
  
  for (const beat of availableBeats) {
    const multiplier = profileBeatBias[beat] || 1.0;
    const weight = Math.round(multiplier * 10); // Convert to integer weight
    
    for (let i = 0; i < Math.max(1, weight); i++) {
      weightedBeats.push(beat);
    }
  }

  // Shuffle and select
  const shuffled = shuffleArray([...weightedBeats]);
  const selected: BeatName[] = [];
  const used = new Set<BeatName>();

  // First pass: unique beats
  for (const beat of shuffled) {
    if (selected.length >= slotsNeeded) break;
    if (!used.has(beat)) {
      selected.push(beat);
      used.add(beat);
    }
  }

  // Second pass: allow repetition if needed
  let beatIndex = 0;
  while (selected.length < slotsNeeded && beatIndex < shuffled.length) {
    selected.push(shuffled[beatIndex]);
    beatIndex++;
  }

  return selected.slice(0, slotsNeeded);
}

function distributeBeatsProportionally(
  beats: BeatName[], 
  slots: number, 
  profileBeatBias?: ProfileBeatBias
): BeatName[] {
  if (slots <= 0) return [];
  if (slots >= beats.length) return beats;

  // Calculate distribution ratio
  const step = beats.length / slots;
  const distributed: BeatName[] = [];

  for (let i = 0; i < slots; i++) {
    const beatIndex = Math.floor(i * step);
    distributed.push(beats[beatIndex]);
  }

  // Apply bias if provided
  if (profileBeatBias) {
    return selectBeatsWithBias(distributed, slots, profileBeatBias);
  }

  return distributed;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Utility function to get beat description for UI
export function getBeatDescription(beat: Beat, lang: 'es' | 'en' = 'es'): string {
  const translation = BEAT_TRANSLATIONS[beat.name][lang];
  return `${translation} (${beat.index}/${beat.total})`;
}

// Utility to get next expected beat
export function getNextBeat(currentBeat: Beat, maxTurns: number, profileBeatBias?: ProfileBeatBias): Beat | null {
  if (currentBeat.index >= maxTurns) return null;
  
  return pickBeatForTurn(currentBeat.index, maxTurns, profileBeatBias);
}