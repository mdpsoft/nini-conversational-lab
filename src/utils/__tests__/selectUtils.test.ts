import { describe, it, expect } from 'vitest';
import { UNSET, coerceSelect, isUnset, labelForUnset } from '../selectUtils';

describe('selectUtils', () => {
  describe('coerceSelect', () => {
    it('should return UNSET for empty string', () => {
      expect(coerceSelect('')).toBe(UNSET);
    });

    it('should return UNSET for null', () => {
      expect(coerceSelect(null)).toBe(UNSET);
    });

    it('should return UNSET for undefined', () => {
      expect(coerceSelect(undefined)).toBe(UNSET);
    });

    it('should return the value for valid strings', () => {
      expect(coerceSelect('valid-value')).toBe('valid-value');
    });

    it('should use custom default when provided', () => {
      expect(coerceSelect('', 'custom-default')).toBe('custom-default');
    });
  });

  describe('isUnset', () => {
    it('should return true for unset sentinel', () => {
      expect(isUnset(UNSET)).toBe(true);
    });

    it('should return true for null', () => {
      expect(isUnset(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isUnset(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isUnset('')).toBe(true);
    });

    it('should return false for valid values', () => {
      expect(isUnset('valid-value')).toBe(false);
    });
  });

  describe('labelForUnset', () => {
    it('should return default label', () => {
      expect(labelForUnset()).toBe('—');
    });

    it('should return custom label', () => {
      expect(labelForUnset('Custom Label')).toBe('Custom Label');
    });
  });
});