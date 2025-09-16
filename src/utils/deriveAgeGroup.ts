export function deriveAgeGroup(age?: number | null): 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'senior' | null {
  if (!age || age < 13) return null;
  if (age < 18) return 'teen';
  if (age < 26) return 'young_adult';
  if (age < 45) return 'adult';
  if (age < 65) return 'middle_aged';
  return 'senior';
}