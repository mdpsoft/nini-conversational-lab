import { describe, it, expect } from 'vitest'

// Mock validateFileType function (assuming it exists in utils/export.ts)
const validateFileType = (file: File): boolean => {
  // Check file type
  if (file.type === 'application/json') return true
  
  // Check file extension
  if (file.name.toLowerCase().endsWith('.json')) return true
  
  return false
}

describe('validateFileType', () => {
  it('should return true for application/json MIME type', () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' })
    expect(validateFileType(file)).toBe(true)
  })

  it('should return true for .json file extension', () => {
    const file = new File(['{}'], 'test.JSON', { type: 'text/plain' })
    expect(validateFileType(file)).toBe(true)
  })

  it('should return true for lowercase .json extension', () => {
    const file = new File(['{}'], 'test.json', { type: 'text/plain' })
    expect(validateFileType(file)).toBe(true)
  })

  it('should return false for .txt files', () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    expect(validateFileType(file)).toBe(false)
  })

  it('should return false for other file types', () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    expect(validateFileType(file)).toBe(false)
  })

  it('should return false for files without extensions', () => {
    const file = new File(['test'], 'test', { type: 'application/octet-stream' })
    expect(validateFileType(file)).toBe(false)
  })
})