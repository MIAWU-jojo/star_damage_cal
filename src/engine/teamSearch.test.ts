import { describe, expect, it } from 'vitest'
import { SUPPORT_PRESETS, getSupport } from '../data/supportPresets'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import { compareTeams, searchSupportCombos } from './teamSearch'
import { adviseSubstats } from './substats'
import { parseFribbelsCharacter, parseRelicScanBonuses } from './fribbels'

describe('searchSupportCombos', () => {
  it('returns ranked triplets', () => {
    const carry = CHARACTER_PRESETS[0].attacker
    const top = searchSupportCombos({
      attacker: carry,
      defender: { level: 80, resistance: 0.2, hasToughness: true },
      pool: SUPPORT_PRESETS.filter((s) => !s.isSurvival),
      topN: 5,
    })
    expect(top.length).toBeGreaterThan(0)
    expect(top[0].supportIds).toHaveLength(3)
    expect(top[0].damage).toBeGreaterThanOrEqual(top[top.length - 1].damage)
  })
})

describe('compareTeams', () => {
  it('builds compare rows', () => {
    const rows = compareTeams({
      attacker: CHARACTER_PRESETS[0].attacker,
      defender: { level: 80, resistance: 0, hasToughness: false },
      teams: [
        {
          label: 'A',
          supports: [getSupport('tingyun')!, getSupport('pela')!, getSupport('huohuo')!],
        },
        {
          label: 'B',
          supports: [getSupport('sparkle')!, getSupport('pela')!, getSupport('ruan-mei')!],
        },
      ],
    })
    expect(rows).toHaveLength(2)
    expect(rows[0].coverageSummary.length).toBeGreaterThan(0)
  })
})

describe('adviseSubstats', () => {
  it('prioritizes speed when below floor', () => {
    const advice = adviseSubstats({
      attacker: CHARACTER_PRESETS[0].attacker,
      defender: { level: 80, resistance: 0, hasToughness: false },
      buffs: {
        vulnerability: 0,
        defReduction: 0,
        resReduction: 0,
        damageTakenReductions: [],
      },
      currentSpeed: 120,
      speedFloor: 134,
    })
    expect(advice[0].id).toBe('speed')
  })
})

describe('fribbels import', () => {
  it('parses flat panel json', () => {
    const parsed = parseFribbelsCharacter({
      name: 'Test',
      atk: 3000,
      critRate: 70,
      critDamage: 150,
      dmgBoost: 48.8,
      level: 80,
      speed: 134,
    })
    expect(parsed).not.toBeNull()
    expect(parsed!.attacker.attributeValue).toBe(3000)
    expect(parsed!.attacker.critRate).toBeCloseTo(0.7, 5)
    expect(parsed!.speed).toBe(134)
  })

  it('parses relic scan flat bonuses', () => {
    const bonuses = parseRelicScanBonuses({
      atkPercent: 20,
      critRate: 10,
      critDamage: 40,
    })
    expect(bonuses?.atkPercent).toBeCloseTo(0.2, 5)
    expect(bonuses?.critRate).toBeCloseTo(0.1, 5)
  })
})
