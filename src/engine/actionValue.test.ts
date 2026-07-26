import { describe, expect, it } from 'vitest'
import {
  COMMON_BREAKPOINTS,
  actionsInCycles,
  checkFirstActionOrder,
  lapAv,
  minSpeedForActions,
  simulateTimeline,
  totalBudgetForCycles,
} from './actionValue'

describe('AV basics', () => {
  it('computes lap AV and MoC budgets', () => {
    expect(lapAv(125)).toBeCloseTo(80, 6)
    expect(totalBudgetForCycles(1)).toBe(150)
    expect(totalBudgetForCycles(2)).toBe(250)
    expect(totalBudgetForCycles(3)).toBe(350)
  })

  it('matches classic breakpoints', () => {
    expect(minSpeedForActions(1, 2)).toBeCloseTo(10000 / 150 * 2, 6)
    expect(minSpeedForActions(1, 2)).toBeCloseTo(133.333333, 4)
    expect(minSpeedForActions(2, 3)).toBeCloseTo(120, 6)
    expect(actionsInCycles(134, 1)).toBe(2)
    expect(actionsInCycles(133, 1)).toBe(1)
    expect(actionsInCycles(120, 2)).toBe(3)
  })

  it('exposes common breakpoint table with correct mins', () => {
    const c1a2 = COMMON_BREAKPOINTS.find((b) => b.id === 'c1a2')!
    expect(c1a2.minSpeed).toBeCloseTo(133.3333, 3)
  })
})

describe('simulateTimeline', () => {
  it('orders two actors by speed and counts cycle actions', () => {
    const tl = simulateTimeline({
      cycles: 1,
      actors: [
        { id: 'a', name: '慢', speed: 100 },
        { id: 'b', name: '快', speed: 134 },
      ],
    })
    expect(tl.events[0].actorId).toBe('b')
    expect(tl.events[0].time).toBeCloseTo(10000 / 134, 4)
    const fast = tl.stats.find((s) => s.actorId === 'b')!
    expect(fast.totalActions).toBe(2)
    expect(fast.actionsPerCycle[0]).toBe(2)
  })

  it('applies start advance (拉条)', () => {
    const noPull = simulateTimeline({
      cycles: 1,
      actors: [{ id: 'x', name: 'X', speed: 100 }],
    })
    const pull = simulateTimeline({
      cycles: 1,
      actors: [
        {
          id: 'x',
          name: 'X',
          speed: 100,
          advanceOnReset: 0.2,
          advanceAtStart: true,
        },
      ],
    })
    expect(pull.events[0].time).toBeCloseTo(80, 4)
    expect(noPull.events[0].time).toBeCloseTo(100, 4)
  })

  it('checks first-action order', () => {
    const tl = simulateTimeline({
      cycles: 1,
      actors: [
        { id: 'sup', name: '辅', speed: 161 },
        { id: 'carry', name: '主', speed: 134 },
      ],
    })
    const ok = checkFirstActionOrder(tl, 'sup', 'carry')
    expect(ok.ok).toBe(true)
    const bad = checkFirstActionOrder(tl, 'carry', 'sup')
    expect(bad.ok).toBe(false)
  })
})
