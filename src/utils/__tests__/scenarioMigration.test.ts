import { describe, it, expect } from 'vitest'
import { mapTopicToRelationshipType, migrateLegacyScenario } from '@/utils/scenarioMigration'
import type { RelationshipType } from '@/types/scenario-audit'

describe('scenarioMigration', () => {
  describe('mapTopicToRelationshipType', () => {
    it('should map English topics correctly', () => {
      expect(mapTopicToRelationshipType('romantic relationship')).toBe('in_relationship')
      expect(mapTopicToRelationshipType('dating')).toBe('dating_undefined')
      expect(mapTopicToRelationshipType('ex-boyfriend')).toBe('ex')
      expect(mapTopicToRelationshipType('friend')).toBe('just_friend')
      expect(mapTopicToRelationshipType('coworker')).toBe('coworker')
      expect(mapTopicToRelationshipType('family')).toBe('family_member')
    })

    it('should map Spanish topics correctly', () => {
      expect(mapTopicToRelationshipType('relación romántica')).toBe('in_relationship')
      expect(mapTopicToRelationshipType('citas')).toBe('dating_undefined')
      expect(mapTopicToRelationshipType('ex-novio')).toBe('ex')
      expect(mapTopicToRelationshipType('amigo')).toBe('just_friend')
      expect(mapTopicToRelationshipType('compañero de trabajo')).toBe('coworker')
      expect(mapTopicToRelationshipType('familia')).toBe('family_member')
    })

    it('should handle case insensitivity', () => {
      expect(mapTopicToRelationshipType('FRIEND')).toBe('just_friend')
      expect(mapTopicToRelationshipType('Dating')).toBe('dating_undefined')
    })

    it('should return null for unknown topics', () => {
      expect(mapTopicToRelationshipType('unknown topic')).toBe(null)
      expect(mapTopicToRelationshipType('')).toBe(null)
      expect(mapTopicToRelationshipType(null)).toBe(null)
      expect(mapTopicToRelationshipType(undefined)).toBe(null)
    })

    it('should handle partial matches', () => {
      expect(mapTopicToRelationshipType('my best friend')).toBe('just_friend')
      expect(mapTopicToRelationshipType('romantic relationship situation')).toBe('in_relationship')
    })
  })

  describe('migrateLegacyScenario', () => {
    it('should migrate basic scenario correctly', () => {
      const legacyScenario = {
        id: 'test-1',
        name: 'Test Scenario',
        topic: 'friend',
        language: 'en' as const,
        goals: ['goal1', 'goal2'],
        seedTurns: [
          { speaker: 'user', text: 'Hello' },
          { speaker: 'ai', text: 'Hi there' }
        ]
      }

      const migrated = migrateLegacyScenario(legacyScenario)

      expect(migrated).toEqual({
        id: 'test-1',
        name: 'Test Scenario',
        relationshipType: 'just_friend',
        language: 'en' as const,
        crisisSignals: null,
        goals: ['goal1', 'goal2'],
        seedTurns: [
          { speaker: 'user', text: 'Hello' },
          { speaker: 'ai', text: 'Hi there' }
        ]
      })
    })

    it('should handle scenarios without mappable topics', () => {
      const legacyScenario = {
        id: 'test-2',
        name: 'Unknown Topic',
        topic: 'unknown topic',
        language: 'es' as const
      }

      const migrated = migrateLegacyScenario(legacyScenario)

      expect(migrated.relationshipType).toBe(null)
    })

    it('should remove attachmentStyle field', () => {
      const legacyScenario = {
        id: 'test-3',
        name: 'Test',
        topic: 'friend',
        attachmentStyle: 'anxious', // should be removed
        language: 'en' as const
      }

      const migrated = migrateLegacyScenario(legacyScenario)

      expect(migrated).not.toHaveProperty('attachmentStyle')
      expect(migrated).not.toHaveProperty('topic')
    })

    it('should handle crisis signals', () => {
      const legacyScenario = {
        id: 'test-4',
        name: 'Crisis Test',
        topic: 'friend',
        language: 'en' as const,
        crisisSignals: 'high'
      }

      const migrated = migrateLegacyScenario(legacyScenario)

      expect(migrated.crisisSignals).toBe('high')
    })
  })
})