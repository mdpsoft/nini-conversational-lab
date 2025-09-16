export type AgeGroup = 'teen_13_17' | 'young_18_29' | 'adult_30_49' | 'mature_50_64' | 'senior_65_plus';

export function clampAge(age?: number | null): number | null {
  if (age == null || Number.isNaN(age)) return null;
  return Math.max(13, Math.min(99, Math.round(age)));
}

export function deriveAgeGroup(age?: number | null): AgeGroup | null {
  if (age == null) return null;
  if (age < 18) return 'teen_13_17';
  if (age < 30) return 'young_18_29';
  if (age < 50) return 'adult_30_49';
  if (age < 65) return 'mature_50_64';
  return 'senior_65_plus';
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

export function labelFor(group?: AgeGroup | null): string {
  switch (group) {
    case 'teen_13_17':    return 'Adolescente (13–17)';
    case 'young_18_29':   return 'Joven adulto (18–29)';
    case 'adult_30_49':   return 'Adulto (30–49)';
    case 'mature_50_64':  return 'Mayor (50–64)';
    case 'senior_65_plus':return 'Senior (65+)';
    default:              return '—';
  }
}