export const UNSET = 'unset' as const;
export type Unset = typeof UNSET;

export function coerceSelect<T extends string | null | undefined>(v: T, d: string = UNSET): string {
  if (v === '' || v === null || v === undefined) return d;
  return String(v);
}

export function isUnset(v?: string | null) { 
  return v === UNSET || v === null || v === undefined || v === ''; 
}

export function labelForUnset(label = '—') { 
  return label; 
}