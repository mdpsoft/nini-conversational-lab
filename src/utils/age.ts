export type AgeGroup =
  | 'teen_13_17'
  | 'young_18_29'
  | 'adult_30_49'
  | 'mature_50_64'
  | 'senior_65_plus';

const LABELS: Record<AgeGroup, string> = {
  teen_13_17: 'Teen (13–17)',
  young_18_29: 'Young adult (18–29)',
  adult_30_49: 'Adult (30–49)',
  mature_50_64: 'Middle-aged (50–64)',
  senior_65_plus: 'Senior (65+)',
};

export function labelFor(group?: AgeGroup | null): string {
  return group ? LABELS[group] : '—';
}

// Deriva grupo a partir de edad (años)
export function deriveAgeGroup(age?: number | null): AgeGroup | null {
  if (age == null || Number.isNaN(age) || age < 0) return null;
  if (age <= 17) return 'teen_13_17';
  if (age <= 29) return 'young_18_29';
  if (age <= 49) return 'adult_30_49';
  if (age <= 64) return 'mature_50_64';
  return 'senior_65_plus';
}

// Opciones para selects
export function ageGroupOptions(): Array<{ value: AgeGroup; label: string }> {
  return (Object.keys(LABELS) as AgeGroup[]).map(value => ({ value, label: LABELS[value] }));
}

export function clampAge(age?: number | null): number | null {
  if (age == null || Number.isNaN(age)) return null;
  return Math.max(13, Math.min(99, Math.round(age)));
}

export function midpointFor(group: AgeGroup): number {
  switch (group) {
    case 'teen_13_17':    return 15;
    case 'young_18_29':   return 24;
    case 'adult_30_49':   return 40;
    case 'mature_50_64':  return 57;
    case 'senior_65_plus':return 70;
  }
}

// Legacy DB compatibility shims
type DbAgeGroupLegacy = 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'senior';

export function dbAgeGroupToUi(v?: string | null): AgeGroup | null {
  if (!v) return null;
  const s = String(v);
  switch (s) {
    case 'teen': return 'teen_13_17';
    case 'young_adult': return 'young_18_29';
    case 'adult': return 'adult_30_49';
    case 'middle_aged': return 'mature_50_64';
    case 'senior': return 'senior_65_plus';
    // Si ya vienen los nuevos valores, respetarlos:
    case 'teen_13_17':
    case 'young_18_29':
    case 'adult_30_49':
    case 'mature_50_64':
    case 'senior_65_plus':
      return s as AgeGroup;
    default:
      return null;
  }
}

export function uiAgeGroupToDb(g?: AgeGroup | null): DbAgeGroupLegacy | null {
  switch (g) {
    case 'teen_13_17': return 'teen';
    case 'young_18_29': return 'young_adult';
    case 'adult_30_49': return 'adult';
    case 'mature_50_64': return 'middle_aged';
    case 'senior_65_plus': return 'senior';
    default: return null;
  }
}