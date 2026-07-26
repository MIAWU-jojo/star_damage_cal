import { describe, expect, it } from 'vitest'
import { DEFAULT_ROTATION, simulateRotation } from './rotation'

const attacker = {
  level: 80,
  attributeValue: 2800,
  baseMultiplier: 1,
  multiplierBonus: 0,
  critRate: 0.7,
  critDamage: 1.4,
  damageBonus: 0.5,
  resPen: 0,
  defIgnore: 0,
}

const buffs = {
  vulnerability: 0,
  defReduction: 0.2,
  resReduction: 0,
  damageTakenReductions: [] as number[],
}

describe('simulateRotation', () => {
  it('sums multi-rail damage and can break toughness mid-rotation', () => {
    const result = simulateRotation({
      attacker,
      buffs,
      defender: {
        level: 80,
        resistance: 0,
        hasToughness: true,
        maxToughness: 40,
      },
      actions: DEFAULT_ROTATION,
      trackToughness: true,
    })
    expect(result.totalDamage).toBeGreaterThan(0)
    expect(result.directLikeTotal).toBeGreaterThan(0)
    expect(result.dotTotal).toBeGreaterThan(0)
    expect(result.steps.some((s) => s.brokeToughness)).toBe(true)
    expect(result.endedBroken).toBe(true)
  })

  it('keeps tougher mitigation when tracking is off and hasToughness true', () => {
    const tracked = simulateRotation({
      attacker,
      buffs,
      defender: { level: 80, resistance: 0, hasToughness: true, maxToughness: 999 },
      actions: [
        {
          id: 's',
          kind: 'skill',
          label: '战技',
          multiplier: 2,
          toughnessDamage: 0,
        },
      ],
      trackToughness: true,
    })
    const broken = simulateRotation({
      attacker,
      buffs,
      defender: { level: 80, resistance: 0, hasToughness: false, maxToughness: 999 },
      actions: [
        {
          id: 's',
          kind: 'skill',
          label: '战技',
          multiplier: 2,
          toughnessDamage: 0,
        },
      ],
      trackToughness: true,
    })
    expect(broken.totalDamage).toBeGreaterThan(tracked.totalDamage)
  })
})
