/**
 * P4.3 — Timeline × rotation damage with shared SP + personal energy.
 * Explains why extra SPD may not raise damage (SP starve / missed buff / delayed ult).
 */

import { calculateDamage } from './damage'
import {
  simulateCombatEvents,
  type BuffRule,
  type CombatTimelineResult,
} from './avEvents'
import type { AvActor } from './actionValue'
import type { AttackerInput, BuffInput, CritMode, DefenderInput } from './types'

export type LoopKind = 'basic' | 'skill' | 'ult'

export interface LoopStep {
  kind: LoopKind
  label: string
  multiplier: number
  toughnessDamage?: number
  /** SP delta: skill usually -1, basic +1. */
  spDelta: number
  energyGain: number
}

export type UltStrategy = 'immediate' | 'buffCovered' | 'manualOnly'

export interface ResourceConfig {
  spStart: number
  spMax: number
  energyStart: number
  energyMax: number
  /** Energy needed to cast ult. */
  ultThreshold: number
  ultStrategy: UltStrategy
  /** Extra dmgBoost applied while any coversCarry buff is active. */
  coveredDamageBoost: number
  ultMultiplier: number
  ultToughnessDamage: number
  ultEnergyGain: number
}

export interface TimelineCombatInput {
  actors: AvActor[]
  buffs: BuffRule[]
  cycles: number
  carryId?: string
  loop: LoopStep[]
  resources: ResourceConfig
  attacker: AttackerInput
  defender: DefenderInput & { maxToughness?: number }
  baseBuffs?: BuffInput
  critMode?: CritMode
  trackToughness?: boolean
}

export interface TimelineCombatHit {
  time: number
  cycle: number
  intendedKind: LoopKind | 'ult'
  actualKind: LoopKind | 'ult'
  label: string
  damage: number
  covered: boolean
  spBefore: number
  spAfter: number
  energyBefore: number
  energyAfter: number
  brokeToughness: boolean
  note?: string
}

export interface TimelineCombatResult {
  combat: CombatTimelineResult
  hits: TimelineCombatHit[]
  damageByCycle: number[]
  totalDamage: number
  diagnostics: string[]
  skillsDowngraded: number
  spOverflowTotal: number
  ultCasts: number
  endedBroken: boolean
}

export const DEFAULT_LOOP: LoopStep[] = [
  {
    kind: 'skill',
    label: '战技',
    multiplier: 2,
    toughnessDamage: 20,
    spDelta: -1,
    energyGain: 30,
  },
  {
    kind: 'basic',
    label: '普攻',
    multiplier: 1,
    toughnessDamage: 10,
    spDelta: 1,
    energyGain: 20,
  },
  {
    kind: 'skill',
    label: '战技',
    multiplier: 2,
    toughnessDamage: 20,
    spDelta: -1,
    energyGain: 30,
  },
]

export const DEFAULT_RESOURCES: ResourceConfig = {
  spStart: 3,
  spMax: 5,
  energyStart: 0,
  energyMax: 120,
  ultThreshold: 120,
  ultStrategy: 'buffCovered',
  coveredDamageBoost: 0.5,
  ultMultiplier: 2.8,
  ultToughnessDamage: 30,
  ultEnergyGain: 5,
}

function clampSp(sp: number, max: number): { sp: number; overflow: number } {
  if (sp > max) return { sp: max, overflow: sp - max }
  if (sp < 0) return { sp: 0, overflow: 0 }
  return { sp, overflow: 0 }
}

function hitDamage(
  attacker: AttackerInput,
  defender: DefenderInput,
  buffs: BuffInput,
  multiplier: number,
  critMode: CritMode,
): number {
  return calculateDamage({
    critMode,
    attacker: {
      ...attacker,
      baseMultiplier: multiplier,
      multiplierBonus: 0,
    },
    defender,
    buffs,
  }).finalDamage
}

function canUlt(
  strategy: UltStrategy,
  energy: number,
  threshold: number,
  covered: boolean,
): boolean {
  if (energy + 1e-9 < threshold) return false
  if (strategy === 'manualOnly') return false
  if (strategy === 'buffCovered') return covered
  return true
}

/**
 * Walk AV combat events: each carry action consumes the next loop step,
 * with SP gating (skill → basic) and optional auto-ult insert.
 */
export function simulateTimelineCombat(
  input: TimelineCombatInput,
): TimelineCombatResult {
  const critMode = input.critMode ?? 'expected'
  const track = input.trackToughness !== false
  const carryId =
    input.carryId ??
    input.actors.find((a) => a.role === 'carry')?.id ??
    input.actors[0]?.id

  const combat = simulateCombatEvents({
    actors: input.actors,
    buffs: input.buffs,
    cycles: input.cycles,
    carryId,
  })

  const baseBuffs: BuffInput = {
    vulnerability: input.baseBuffs?.vulnerability ?? 0,
    defReduction: input.baseBuffs?.defReduction ?? 0,
    resReduction: input.baseBuffs?.resReduction ?? 0,
    damageTakenReductions: input.baseBuffs?.damageTakenReductions ?? [],
  }

  const res = input.resources
  const loop = input.loop.length > 0 ? input.loop : DEFAULT_LOOP
  let sp = res.spStart
  let energy = res.energyStart
  let loopIndex = 0
  let maxTough = Math.max(1, input.defender.maxToughness ?? 100)
  let toughness = input.defender.hasToughness ? maxTough : 0
  let broken = !input.defender.hasToughness || toughness <= 0

  const hits: TimelineCombatHit[] = []
  const damageByCycle: number[] = Array.from({ length: input.cycles }, () => 0)
  const diagnostics: string[] = [...combat.diagnostics]
  let skillsDowngraded = 0
  let spOverflowTotal = 0
  let ultCasts = 0

  const applyToughness = (raw: number): boolean => {
    if (!track || broken) return false
    toughness = Math.max(0, toughness - Math.max(0, raw))
    if (toughness <= 0) {
      broken = true
      return true
    }
    return false
  }

  const resolveHit = (args: {
    time: number
    cycle: number
    kind: LoopKind | 'ult'
    intended: LoopKind | 'ult'
    label: string
    multiplier: number
    toughnessDamage: number
    covered: boolean
    spDelta: number
    energyGain: number
    note?: string
  }) => {
    const spBefore = sp
    const energyBefore = energy
    const attackerNow: AttackerInput = {
      ...input.attacker,
      damageBonus:
        input.attacker.damageBonus +
        (args.covered ? res.coveredDamageBoost : 0),
    }
    const defenderNow: DefenderInput = {
      level: input.defender.level,
      defense: input.defender.defense,
      resistance: input.defender.resistance,
      hasToughness: track ? !broken : input.defender.hasToughness,
    }
    const damage = hitDamage(
      attackerNow,
      defenderNow,
      baseBuffs,
      args.multiplier,
      critMode,
    )
    const brokeToughness = applyToughness(args.toughnessDamage)

    let nextSp = sp + args.spDelta
    const clamped = clampSp(nextSp, res.spMax)
    sp = clamped.sp
    spOverflowTotal += clamped.overflow

    if (args.kind === 'ult') {
      energy = Math.min(res.energyMax, args.energyGain)
    } else {
      energy = Math.min(res.energyMax, energy + args.energyGain)
    }

    const cycleIdx = Math.max(0, Math.min(input.cycles - 1, args.cycle - 1))
    damageByCycle[cycleIdx] = (damageByCycle[cycleIdx] ?? 0) + damage

    hits.push({
      time: args.time,
      cycle: args.cycle,
      intendedKind: args.intended,
      actualKind: args.kind,
      label: args.label,
      damage,
      covered: args.covered,
      spBefore,
      spAfter: sp,
      energyBefore,
      energyAfter: energy,
      brokeToughness,
      note: args.note,
    })
  }

  const coverageAt = (time: number): boolean => {
    const match = combat.events.find(
      (e) =>
        (e.kind === 'action' || e.kind === 'ult') &&
        e.actorId === carryId &&
        Math.abs(e.time - time) < 1e-6,
    )
    return match?.covered === true
  }

  for (const baseEv of combat.base.events) {
    if (baseEv.actorId !== carryId) continue

    const cycleNum = baseEv.cycle
    const covered = coverageAt(baseEv.time)

    // Auto-ult insert before planned action
    if (canUlt(res.ultStrategy, energy, res.ultThreshold, covered)) {
      ultCasts += 1
      resolveHit({
        time: baseEv.time,
        cycle: cycleNum,
        kind: 'ult',
        intended: 'ult',
        label: '终结技（自动）',
        multiplier: res.ultMultiplier,
        toughnessDamage: res.ultToughnessDamage,
        covered,
        spDelta: 0,
        energyGain: res.ultEnergyGain,
        note:
          res.ultStrategy === 'buffCovered'
            ? 'Buff 内满能放出'
            : '满能立即放出',
      })
    } else if (
      energy + 1e-9 >= res.ultThreshold &&
      res.ultStrategy === 'buffCovered' &&
      !covered
    ) {
      diagnostics.push(
        `AV ${baseEv.time.toFixed(2)}：能量已满但无 Buff 覆盖，终结技按策略暂扣`,
      )
    }

    const intended = loop[loopIndex % loop.length]
    loopIndex += 1
    let actual: LoopStep = intended
    let note: string | undefined

    if (intended.kind === 'ult' && energy + 1e-9 < res.ultThreshold) {
      diagnostics.push(
        `AV ${baseEv.time.toFixed(2)}：循环要放终结技，但能量 ${energy.toFixed(0)}/${res.ultThreshold}`,
      )
      actual = {
        kind: 'basic',
        label: '普攻（能量不足）',
        multiplier: loop.find((s) => s.kind === 'basic')?.multiplier ?? 1,
        toughnessDamage:
          loop.find((s) => s.kind === 'basic')?.toughnessDamage ?? 10,
        spDelta: loop.find((s) => s.kind === 'basic')?.spDelta ?? 1,
        energyGain: loop.find((s) => s.kind === 'basic')?.energyGain ?? 20,
      }
      note = '循环终结技因能量不足降级'
    } else if (intended.spDelta < 0 && sp + intended.spDelta < 0) {
      skillsDowngraded += 1
      actual = {
        kind: 'basic',
        label: '普攻（缺 SP）',
        multiplier: loop.find((s) => s.kind === 'basic')?.multiplier ?? 1,
        toughnessDamage:
          loop.find((s) => s.kind === 'basic')?.toughnessDamage ?? 10,
        spDelta: loop.find((s) => s.kind === 'basic')?.spDelta ?? 1,
        energyGain: loop.find((s) => s.kind === 'basic')?.energyGain ?? 20,
      }
      note = `原计划 ${intended.label}，缺 ${-intended.spDelta} SP`
      diagnostics.push(
        `AV ${baseEv.time.toFixed(2)}：缺 ${-intended.spDelta} SP，${intended.label} → 普攻`,
      )
    }

    resolveHit({
      time: baseEv.time,
      cycle: cycleNum,
      kind: actual.kind,
      intended: intended.kind,
      label: actual.label,
      multiplier: actual.multiplier,
      toughnessDamage: actual.toughnessDamage ?? 0,
      covered,
      spDelta: actual.spDelta,
      energyGain: actual.energyGain,
      note,
    })
  }

  if (skillsDowngraded > 0) {
    diagnostics.unshift(
      `战技因缺 SP 降级 ${skillsDowngraded} 次——多动不一定多伤`,
    )
  }

  const totalDamage = damageByCycle.reduce((a, b) => a + b, 0)

  return {
    combat,
    hits,
    damageByCycle,
    totalDamage,
    diagnostics: [...new Set(diagnostics)],
    skillsDowngraded,
    spOverflowTotal,
    ultCasts,
    endedBroken: broken,
  }
}

/** Compare two carry speeds under identical team/loop — for explainability. */
export function compareCarrySpeedDamage(
  base: TimelineCombatInput,
  speedA: number,
  speedB: number,
): { a: TimelineCombatResult; b: TimelineCombatResult; deltaRatio: number } {
  const withSpeed = (spd: number): TimelineCombatInput => ({
    ...base,
    actors: base.actors.map((a) =>
      a.id === (base.carryId ?? 'c1') || a.role === 'carry'
        ? { ...a, speed: spd }
        : a,
    ),
  })
  const a = simulateTimelineCombat(withSpeed(speedA))
  const b = simulateTimelineCombat(withSpeed(speedB))
  const deltaRatio =
    a.totalDamage > 0 ? (b.totalDamage - a.totalDamage) / a.totalDamage : 0
  return { a, b, deltaRatio }
}
