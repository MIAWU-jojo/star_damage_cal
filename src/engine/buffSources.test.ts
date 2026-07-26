import { describe, expect, it } from 'vitest'
import { mergeCombatLayers, summarizeLayer } from './buffSources'
import type { AttackerInput, BuffInput } from './types'

const baseAttacker: AttackerInput = {
  level: 80,
  attributeValue: 2000,
  baseMultiplier: 2,
  multiplierBonus: 0,
  critRate: 0.5,
  critDamage: 1,
  damageBonus: 0.4,
  resPen: 0,
  defIgnore: 0,
}

const emptyBuffs: BuffInput = {
  vulnerability: 0,
  defReduction: 0,
  resReduction: 0,
  damageTakenReductions: [],
}

describe('mergeCombatLayers', () => {
  it('stacks light cone and relic without mutating base panel numbers in sources', () => {
    const merged = mergeCombatLayers({
      baseAttacker,
      baseBuffs: emptyBuffs,
      layers: [
        {
          kind: 'lightCone',
          id: 'cone',
          name: '测试光锥',
          critRate: 0.18,
          damageBonus: 0.2,
        },
        {
          kind: 'relic',
          id: 'set',
          name: '测试套',
          defIgnore: 0.1,
          atkPercent: 0.2,
        },
      ],
    })

    expect(merged.attacker.damageBonus).toBeCloseTo(0.6)
    expect(merged.attacker.critRate).toBeCloseTo(0.68)
    expect(merged.attacker.defIgnore).toBeCloseTo(0.1)
    expect(merged.attacker.attributeValue).toBeCloseTo(2400)
    expect(merged.sources.map((s) => s.kind)).toEqual([
      'character',
      'lightCone',
      'relic',
    ])
  })

  it('includes manual buffs as a tagged source', () => {
    const merged = mergeCombatLayers({
      baseAttacker,
      baseBuffs: {
        vulnerability: 0.3,
        defReduction: 0.2,
        resReduction: 0,
        damageTakenReductions: [0.1],
      },
      layers: [],
    })
    expect(merged.buffs.vulnerability).toBeCloseTo(0.3)
    expect(merged.sources.some((s) => s.kind === 'manual')).toBe(true)
  })

  it('caps crit rate at 100%', () => {
    const merged = mergeCombatLayers({
      baseAttacker: { ...baseAttacker, critRate: 0.9 },
      baseBuffs: emptyBuffs,
      layers: [{ kind: 'lightCone', id: 'x', name: 'x', critRate: 0.3 }],
    })
    expect(merged.attacker.critRate).toBe(1)
  })
})

describe('summarizeLayer', () => {
  it('skips zero parts', () => {
    const row = summarizeLayer({
      kind: 'relic',
      id: 'r',
      name: '套',
      damageBonus: 0.1,
      vulnerability: 0,
    })
    expect(row.parts).toEqual(['增伤+10%'])
  })
})
