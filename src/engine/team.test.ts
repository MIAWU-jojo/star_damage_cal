import { describe, expect, it } from 'vitest'
import { SUPPORT_PRESETS, getSupport } from '../data/supportPresets'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import {
  aggregateSupports,
  buildCoverage,
  diagnoseGaps,
  optimizeSingleSwap,
  teamDamage,
} from './team'

describe('team aggregation', () => {
  it('sums support zones', () => {
    const pela = getSupport('pela')!
    const tingyun = getSupport('tingyun')!
    const agg = aggregateSupports([pela, tingyun])
    expect(agg.defReduction).toBeCloseTo(0.4, 5)
    expect(agg.damageBonus).toBeCloseTo(0.5, 5)
  })

  it('flags def gap when no shred', () => {
    const tingyun = getSupport('tingyun')!
    const coverage = buildCoverage(aggregateSupports([tingyun]))
    const gap = diagnoseGaps(coverage)
    expect(gap.weakestZoneId).toBe('def')
  })

  it('ranks a def support swap highly for shred-less team', () => {
    const carry = CHARACTER_PRESETS[0].attacker
    const team = [getSupport('tingyun')!, getSupport('robin')!, getSupport('huohuo')!]
    const swaps = optimizeSingleSwap({
      attacker: carry,
      defender: { level: 80, resistance: 0.2, hasToughness: true },
      team,
      candidates: SUPPORT_PRESETS,
      topN: 5,
    })
    expect(swaps.length).toBeGreaterThan(0)
    expect(swaps[0].gainRatio).toBeGreaterThan(0)
    // Top suggestions should include someone who fills DEF or RES shred
    const topIds = swaps.slice(0, 3).map((s) => s.incomingId)
    expect(topIds.some((id) => ['pela', 'silver-wolf', 'ruan-mei', 'jiaoqiu'].includes(id))).toBe(
      true,
    )
  })

  it('team damage exceeds solo when buffers present', () => {
    const carry = CHARACTER_PRESETS[0].attacker
    const defender = { level: 80, resistance: 0, hasToughness: false }
    const solo = teamDamage({ attacker: carry, defender, supports: [] })
    const buffed = teamDamage({
      attacker: carry,
      defender,
      supports: [getSupport('tingyun')!, getSupport('pela')!],
    })
    expect(buffed).toBeGreaterThan(solo)
  })
})
