export function deriveAgeGroup(age?: number): 'teen' | 'young_adult' | 'adult' | 'mature' | 'senior' | null {
  if (!age || age < 13) return null;
  if (age < 18) return 'teen';
  if (age < 26) return 'young_adult';
  if (age < 45) return 'adult';
  if (age < 65) return 'mature';
  return 'senior';
}