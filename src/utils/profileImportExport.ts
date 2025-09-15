// Utilities for importing and exporting USERAI profiles

import { UserAIProfile } from '../store/profiles';

export interface ProfileBundle {
  kind: 'userai.profile.bundle';
  version: 1;
  exportedAt: string;
  count: number;
  profiles: UserAIProfile[];
}

export interface ConflictResolution {
  profileId: string;
  action: 'keep' | 'overwrite' | 'duplicate';
  newName?: string;
  newId?: string;
}

/**
 * Exports selected profiles as a JSON bundle
 */
export function exportProfiles(profiles: UserAIProfile[]): string {
  const bundle: ProfileBundle = {
    kind: 'userai.profile.bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: profiles.length,
    profiles: profiles
  };
  
  return JSON.stringify(bundle, null, 2);
}

/**
 * Generates a filename for the export
 */
export function generateExportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `userai-profiles-${year}${month}${day}-${hours}${minutes}.json`;
}

/**
 * Downloads a string as a file
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates the structure of an imported bundle
 */
export function validateProfileBundle(data: any): { valid: boolean; error?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Invalid JSON structure' };
  }
  
  if (data.kind !== 'userai.profile.bundle') {
    return { valid: false, error: 'Invalid bundle type' };
  }
  
  if (data.version !== 1) {
    return { valid: false, error: 'Unsupported bundle version' };
  }
  
  if (!Array.isArray(data.profiles)) {
    return { valid: false, error: 'Profiles must be an array' };
  }
  
  // Validate each profile has required fields
  for (let i = 0; i < data.profiles.length; i++) {
    const profile = data.profiles[i];
    if (!profile.id || !profile.name || !profile.lang) {
      return { valid: false, error: `Profile ${i + 1} is missing required fields (id, name, lang)` };
    }
  }
  
  return { valid: true };
}

/**
 * Detects conflicts between imported and existing profiles
 */
export function detectConflicts(
  importedProfiles: UserAIProfile[], 
  existingProfiles: UserAIProfile[]
): string[] {
  const existingIds = new Set(existingProfiles.map(p => p.id));
  return importedProfiles
    .filter(profile => existingIds.has(profile.id))
    .map(profile => profile.id);
}

/**
 * Resolves conflicts by applying the specified resolutions
 */
export function resolveConflicts(
  importedProfiles: UserAIProfile[],
  resolutions: ConflictResolution[]
): UserAIProfile[] {
  const resolutionMap = new Map(resolutions.map(r => [r.profileId, r]));
  
  return importedProfiles.map(profile => {
    const resolution = resolutionMap.get(profile.id);
    if (!resolution) {
      return profile; // No conflict
    }
    
    switch (resolution.action) {
      case 'keep':
        return null; // Skip this profile
      case 'overwrite':
        return profile; // Use as-is
      case 'duplicate':
        return {
          ...profile,
          id: resolution.newId || generateDuplicateId(profile.id),
          name: resolution.newName || `${profile.name} (Importado)`,
          version: profile.version + 1
        };
      default:
        return profile;
    }
  }).filter(Boolean) as UserAIProfile[];
}

/**
 * Generates a unique ID for duplicate profiles
 */
function generateDuplicateId(originalId: string): string {
  const timestamp = Date.now();
  const baseId = originalId.replace(/\.v\d+$/, '');
  return `${baseId}-import-${timestamp}.v1`;
}

/**
 * Reads a file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}