import { describe, expect, it } from 'vitest'
import { calculateDamage, critZone, defenseZone, resistanceZone } from './damage'

describe('critZone', () => {
  it('handles expected / crit / noncrit', () => {
    expect(critZone('noncrit', 0.8, 1.5)).toBe(1)
    expect(critZone('crit', 0.8, 1.5)).toBe(2.5)
    expect(critZone('expected', 0.5, 1.0)).toBe(1.5)
    expect(critZone('expected', 1.2, 1.0)).toBe(2)
  })
})

describe('defenseZone', () => {
  it('is 0.5 at same level with no shred', () => {
    expect(defenseZone(80, 80 * 10 + 200, 0, 0)).toBeCloseTo(0.5, 6)
  })

  it('adds shred and ignore, capped at 100%', () => {
    const full = defenseZone(80, 1000, 0.6, 0.5)
    expect(full).toBeCloseTo(1, 6)
  })
})

describe('resistanceZone', () => {
  it('clamps to wiki bounds', () => {
    expect(resistanceZone(0.9, 0, 0)).toBeCloseTo(0.1, 6)
    expect(resistanceZone(0, 0, 1.5)).toBeCloseTo(2, 6)
  })
})

describe('calculateDamage', () => {
  it('matches a hand-checked direct hit', () => {
    const result = calculateDamage({
      critMode: 'crit',
      attacker: {
        level: 80,
        attributeValue: 3000,
        baseMultiplier: 2,
        multiplierBonus: 0,
        critRate: 0.7,
        critDamage: 1.5,
        damageBonus: 0.5,
        resPen: 0,
        defIgnore: 0,
      },
      defender: {
        level: 80,
        resistance: 0.2,
        hasToughness: true,
      },
      buffs: {
        vulnerability: 0.3,
        defReduction: 0.2,
        resReduction: 0.2,
        damageTakenReductions: [],
      },
    })

    // base = 6000
    // crit = 2.5
    // bonus = 1.5
    // def = 1000 / (1000 + 1000*0.8) = 1000/1800 ≈ 0.555556
    // res = 1 - 0.2 + 0.2 = 1
    // vuln = 1.3
    // redu = 0.9
    // final = 6000 * 2.5 * 1.5 * (1000/1800) * 1 * 1.3 * 0.9
    const expected = 6000 * 2.5 * 1.5 * (1000 / 1800) * 1 * 1.3 * 0.9
    expect(result.finalDamage).toBeCloseTo(expected, 4)
    expect(result.zones).toHaveLength(7)
    expect(result.marginals[0].gainRatio).toBeGreaterThan(0)
  })

  it('returns 0% marginal gains when baseline damage is zero', () => {
    const result = calculateDamage({
      critMode: 'expected',
      attacker: {
        level: 80,
        attributeValue: 0,
        baseMultiplier: 2,
        multiplierBonus: 0,
        critRate: 0.5,
        critDamage: 1,
        damageBonus: 0.5,
        resPen: 0,
        defIgnore: 0,
      },
      defender: { level: 80, resistance: 0, hasToughness: false },
      buffs: {
        vulnerability: 0,
        defReduction: 0,
        resReduction: 0,
        damageTakenReductions: [],
      },
    })
    expect(result.finalDamage).toBe(0)
    expect(result.marginals.every((m) => m.gainRatio === 0)).toBe(true)
  })
})
