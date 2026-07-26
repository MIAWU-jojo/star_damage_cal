import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOOP,
  DEFAULT_RESOURCES,
  compareCarrySpeedDamage,
  simulateTimelineCombat,
} from './timelineCombat'

const baseAttacker = {
  level: 80,
  attributeValue: 3000,
  critRate: 0.7,
  critDamage: 1.5,
  damageBonus: 0.5,
  baseMultiplier: 1,
  multiplierBonus: 0,
  defIgnore: 0,
  resPen: 0,
}

const baseDefender = {
  level: 90,
  defense: 1000,
  resistance: 0.2,
  hasToughness: true,
  maxToughness: 100,
}

describe('simulateTimelineCombat', () => {
  it('produces per-cycle damage and hits for carry actions', () => {
    const result = simulateTimelineCombat({
      cycles: 2,
      actors: [
        { id: 's1', name: '辅', speed: 161, role: 'support' },
        { id: 'c1', name: '主', speed: 134, role: 'carry' },
      ],
      buffs: [
        {
          id: 'b1',
          name: '同谐窗',
          sourceActorId: 's1',
          durationKind: 'sourceTurns',
          duration: 2,
          coversCarry: true,
        },
      ],
      loop: DEFAULT_LOOP,
      resources: { ...DEFAULT_RESOURCES, energyStart: 0, ultStrategy: 'manualOnly' },
      attacker: baseAttacker,
      defender: baseDefender,
      carryId: 'c1',
    })

    expect(result.hits.length).toBeGreaterThan(0)
    expect(result.damageByCycle.length).toBe(2)
    expect(result.totalDamage).toBeGreaterThan(0)
    expect(result.damageByCycle.reduce((a, b) => a + b, 0)).toBeCloseTo(
      result.totalDamage,
      4,
    )
  })

  it('downgrades skill to basic when SP is empty', () => {
    const result = simulateTimelineCombat({
      cycles: 1,
      actors: [{ id: 'c1', name: '主', speed: 134, role: 'carry' }],
      buffs: [],
      loop: [
        {
          kind: 'skill',
          label: '战技',
          multiplier: 2,
          spDelta: -1,
          energyGain: 30,
          toughnessDamage: 20,
        },
        {
          kind: 'skill',
          label: '战技',
          multiplier: 2,
          spDelta: -1,
          energyGain: 30,
          toughnessDamage: 20,
        },
        {
          kind: 'skill',
          label: '战技',
          multiplier: 2,
          spDelta: -1,
          energyGain: 30,
          toughnessDamage: 20,
        },
      ],
      resources: {
        ...DEFAULT_RESOURCES,
        spStart: 1,
        ultStrategy: 'manualOnly',
        coveredDamageBoost: 0,
      },
      attacker: baseAttacker,
      defender: baseDefender,
      carryId: 'c1',
    })

    expect(result.skillsDowngraded).toBeGreaterThan(0)
    expect(result.hits.some((h) => h.actualKind === 'basic')).toBe(true)
    expect(result.diagnostics.some((d) => d.includes('缺') && d.includes('SP'))).toBe(
      true,
    )
  })

  it('explains speed bump via compareCarrySpeedDamage', () => {
    const base = {
      cycles: 1 as const,
      actors: [
        { id: 's1', name: '辅', speed: 161, role: 'support' as const },
        { id: 'c1', name: '主', speed: 133, role: 'carry' as const },
      ],
      buffs: [
        {
          id: 'b1',
          name: '同谐窗',
          sourceActorId: 's1',
          durationKind: 'sourceTurns' as const,
          duration: 2,
          coversCarry: true,
        },
      ],
      loop: DEFAULT_LOOP,
      resources: {
        ...DEFAULT_RESOURCES,
        spStart: 3,
        ultStrategy: 'manualOnly' as const,
      },
      attacker: baseAttacker,
      defender: baseDefender,
      carryId: 'c1',
    }
    const { a, b } = compareCarrySpeedDamage(base, 133, 134)
    // 134 usually gets one more first-cycle action than 133
    expect(b.hits.length).toBeGreaterThanOrEqual(a.hits.length)
  })
})
