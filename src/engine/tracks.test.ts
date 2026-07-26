import { describe, expect, it } from 'vitest'
import {
  breakBaseByLevel,
  calculateAdditionalDamage,
  calculateBreakDamage,
  calculateDotDamage,
  calculateSuperBreakDamage,
} from './tracks'

const defender = { level: 80, resistance: 0.2, hasToughness: true }
const buffs = {
  vulnerability: 0,
  defReduction: 0,
  resReduction: 0,
  damageTakenReductions: [] as number[],
}

describe('DOT rail', () => {
  it('has no crit and scales with stacks', () => {
    const one = calculateDotDamage({
      attacker: {
        level: 80,
        attributeValue: 2000,
        damageBonus: 0.5,
        defIgnore: 0,
        resPen: 0,
      },
      defender,
      buffs,
      dotMultiplier: 0.5,
      stacks: 1,
    })
    const two = calculateDotDamage({
      attacker: {
        level: 80,
        attributeValue: 2000,
        damageBonus: 0.5,
        defIgnore: 0,
        resPen: 0,
      },
      defender,
      buffs,
      dotMultiplier: 0.5,
      stacks: 2,
    })
    expect(one.hasCrit).toBe(false)
    expect(two.finalDamage).toBeCloseTo(one.finalDamage * 2, 5)
  })
})

describe('Break rail', () => {
  it('uses level break base and BE', () => {
    expect(breakBaseByLevel(80)).toBeGreaterThan(3000)
    const low = calculateBreakDamage({
      attackerLevel: 80,
      breakEffect: 0,
      elementalMultiplier: 1,
      toughnessDamageUnits: 2,
      defender: { ...defender, hasToughness: false },
      buffs,
    })
    const high = calculateBreakDamage({
      attackerLevel: 80,
      breakEffect: 1,
      elementalMultiplier: 1,
      toughnessDamageUnits: 2,
      defender: { ...defender, hasToughness: false },
      buffs,
    })
    expect(high.finalDamage).toBeCloseTo(low.finalDamage * 2, 4)
  })

  it('super break scales multiplier on broken target', () => {
    const br = calculateBreakDamage({
      attackerLevel: 80,
      breakEffect: 1,
      elementalMultiplier: 1,
      toughnessDamageUnits: 2,
      defender: { ...defender, hasToughness: false },
      buffs,
    })
    const sb = calculateSuperBreakDamage({
      attackerLevel: 80,
      breakEffect: 1,
      elementalMultiplier: 1,
      toughnessDamageUnits: 2,
      superBreakMultiplier: 1.5,
      defender: { ...defender, hasToughness: false },
      buffs,
    })
    expect(sb.finalDamage).toBeCloseTo(br.finalDamage * 1.5, 4)
  })
})

describe('Additional rail', () => {
  it('can disable crit', () => {
    const withCrit = calculateAdditionalDamage({
      attacker: {
        level: 80,
        attributeValue: 2000,
        baseMultiplier: 1,
        multiplierBonus: 0,
        critRate: 1,
        critDamage: 1,
        damageBonus: 0,
        resPen: 0,
        defIgnore: 0,
      },
      defender: { ...defender, hasToughness: false },
      buffs,
      additionalMultiplier: 1,
      canCrit: true,
      critMode: 'crit',
    })
    const noCrit = calculateAdditionalDamage({
      attacker: {
        level: 80,
        attributeValue: 2000,
        baseMultiplier: 1,
        multiplierBonus: 0,
        critRate: 1,
        critDamage: 1,
        damageBonus: 0,
        resPen: 0,
        defIgnore: 0,
      },
      defender: { ...defender, hasToughness: false },
      buffs,
      additionalMultiplier: 1,
      canCrit: false,
      critMode: 'crit',
    })
    expect(withCrit.critMultiplier).toBe(2)
    expect(noCrit.critMultiplier).toBe(1)
    expect(withCrit.finalDamage).toBeGreaterThan(noCrit.finalDamage)
  })
})
