/**
 * P4.2 — AV combat event stream + buff windows.
 * Builds on actionValue timeline; does not parse full character kits.
 *
 * Speed-change helpers follow KQM gauge logic: remaining distance is kept,
 * AV = distance / speed (speed buffs recalculate current AG, not only next lap).
 * @see https://hsr.keqingmains.com/misc/speed-guide/
 */

import { avFromDistance, simulateTimeline, type AvActor, type TimelineResult } from './actionValue'

export type AvEventKind =
  | 'action'
  | 'buffStart'
  | 'buffExpire'
  | 'speedChange'
  | 'advance'
  | 'delay'
  | 'ult'
  | 'break'

export type BuffDurationKind = 'sourceTurns' | 'av'

export interface BuffRule {
  id: string
  name: string
  /** Actor whose action starts this buff. */
  sourceActorId: string
  /** When the source acts, which action indices trigger (1-based). Empty = every action. */
  triggerActions?: number[]
  /** Treat trigger action as ult for labeling. */
  asUlt?: boolean
  durationKind: BuffDurationKind
  /** sourceTurns: live across N source actions incl. starter; av: absolute AV length. */
  duration: number
  /** Who is considered covered when checking carry actions. */
  coversCarry: boolean
  note?: string
}

export interface CombatEvent {
  time: number
  kind: AvEventKind
  label: string
  actorId?: string
  actorName?: string
  buffId?: string
  /** Buff ids active immediately after this event. */
  activeBuffIds: string[]
  /** For carry action events: whether any coversCarry buff was up. */
  covered?: boolean
}

export interface BuffCoverageRow {
  buffId: string
  buffName: string
  carryActionsTotal: number
  carryActionsCovered: number
  coverageRatio: number
  missedActionIndexes: number[]
}

export interface CombatTimelineResult {
  base: TimelineResult
  events: CombatEvent[]
  coverage: BuffCoverageRow[]
  diagnostics: string[]
}

interface ActiveBuff {
  rule: BuffRule
  expireAt?: number
  sourceActionsLeft?: number
}

/**
 * Mid-combat speed change: remaining distance kept, AV recalculated.
 */
export function recalcAvAfterSpeedChange(
  remainingAv: number,
  oldSpeed: number,
  newSpeed: number,
): number {
  const distance = Math.max(0, remainingAv) * Math.max(oldSpeed, 1e-9)
  return avFromDistance(distance, newSpeed)
}

/**
 * Advance/delay on remaining gauge (fraction of current remaining distance).
 * advance 0.2 → remaining distance *= 0.8.
 */
export function applyGaugeAdvance(
  remainingAv: number,
  speed: number,
  advanceFraction: number,
): number {
  const distance = Math.max(0, remainingAv) * Math.max(speed, 1e-9)
  const frac = Math.min(0.99, Math.max(-0.99, advanceFraction))
  const nextDistance = distance * (1 - frac)
  return avFromDistance(Math.max(0, nextDistance), speed)
}

function snapshotIds(active: ActiveBuff[]): string[] {
  return active.map((a) => a.rule.id).sort()
}

function carryCovered(active: ActiveBuff[]): boolean {
  return active.some((a) => a.rule.coversCarry)
}

/**
 * Merge base AV actions with buff start/expire events.
 */
export function simulateCombatEvents(args: {
  actors: AvActor[]
  buffs: BuffRule[]
  cycles?: number
  carryId?: string
}): CombatTimelineResult {
  const cycles = args.cycles ?? 2
  const base = simulateTimeline({ actors: args.actors, cycles })
  const carryId =
    args.carryId ??
    args.actors.find((a) => a.role === 'carry')?.id ??
    args.actors[0]?.id

  const nameOf = (id: string) =>
    args.actors.find((a) => a.id === id)?.name ?? id

  const events: CombatEvent[] = []
  let active: ActiveBuff[] = []
  const coverageMap = new Map<
    string,
    { rule: BuffRule; total: number; covered: number; missed: number[] }
  >()
  for (const b of args.buffs) {
    coverageMap.set(b.id, { rule: b, total: 0, covered: 0, missed: [] })
  }

  const diagnostics: string[] = []
  let carryActionIndex = 0

  const patchTrailingExpireIds = () => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].kind !== 'buffExpire') break
      events[i] = { ...events[i], activeBuffIds: snapshotIds(active) }
    }
  }

  for (const step of base.events) {
    // Expire AV-duration buffs at this timestamp
    {
      const kept: ActiveBuff[] = []
      for (const ab of active) {
        if (ab.expireAt != null && step.time >= ab.expireAt - 1e-9) {
          events.push({
            time: step.time,
            kind: 'buffExpire',
            label: `${ab.rule.name} 到期`,
            buffId: ab.rule.id,
            actorId: ab.rule.sourceActorId,
            actorName: nameOf(ab.rule.sourceActorId),
            activeBuffIds: [],
          })
        } else {
          kept.push(ab)
        }
      }
      active = kept
      patchTrailingExpireIds()
    }

    const triggers = args.buffs.filter((b) => {
      if (b.sourceActorId !== step.actorId) return false
      if (!b.triggerActions || b.triggerActions.length === 0) return true
      return b.triggerActions.includes(step.actionIndex)
    })

    for (const rule of triggers) {
      active = active.filter((a) => a.rule.id !== rule.id)
      const ab: ActiveBuff = { rule }
      if (rule.durationKind === 'av') {
        ab.expireAt = step.time + rule.duration
      } else {
        ab.sourceActionsLeft = rule.duration
      }
      active.push(ab)
      events.push({
        time: step.time,
        kind: 'buffStart',
        label: `${rule.name} 开始` + (rule.asUlt ? '（终结技）' : ''),
        buffId: rule.id,
        actorId: step.actorId,
        actorName: step.actorName,
        activeBuffIds: snapshotIds(active),
      })
    }

    const isCarry = step.actorId === carryId
    const covered = carryCovered(active)

    if (isCarry) {
      carryActionIndex += 1
      for (const [, row] of coverageMap) {
        if (!row.rule.coversCarry) continue
        row.total += 1
        const up = active.some((a) => a.rule.id === row.rule.id)
        if (up) row.covered += 1
        else row.missed.push(carryActionIndex)
      }
      if (!covered && args.buffs.some((b) => b.coversCarry)) {
        diagnostics.push(
          `主 C 第 ${carryActionIndex} 动（AV ${step.time.toFixed(2)}）无覆盖 Buff`,
        )
      }
    }

    events.push({
      time: step.time,
      kind: isCarry && triggers.some((t) => t.asUlt) ? 'ult' : 'action',
      label: `${step.actorName} 第 ${step.actionIndex} 动 · 轮 ${step.cycle}`,
      actorId: step.actorId,
      actorName: step.actorName,
      activeBuffIds: snapshotIds(active),
      covered: isCarry ? covered : undefined,
    })

    // Decrement source-turn buffs after the source acted
    const nextActive: ActiveBuff[] = []
    for (const ab of active) {
      if (
        ab.rule.sourceActorId === step.actorId &&
        ab.sourceActionsLeft != null
      ) {
        const left = ab.sourceActionsLeft - 1
        if (left <= 0) {
          events.push({
            time: step.time,
            kind: 'buffExpire',
            label: `${ab.rule.name} 到期`,
            buffId: ab.rule.id,
            actorId: step.actorId,
            actorName: step.actorName,
            activeBuffIds: [],
          })
          continue
        }
        nextActive.push({ ...ab, sourceActionsLeft: left })
      } else {
        nextActive.push(ab)
      }
    }
    active = nextActive
    patchTrailingExpireIds()
  }

  const coverage: BuffCoverageRow[] = [...coverageMap.values()]
    .filter((r) => r.rule.coversCarry)
    .map((r) => ({
      buffId: r.rule.id,
      buffName: r.rule.name,
      carryActionsTotal: r.total,
      carryActionsCovered: r.covered,
      coverageRatio: r.total > 0 ? r.covered / r.total : 0,
      missedActionIndexes: r.missed,
    }))

  if (coverage.length > 0) {
    const worst = [...coverage].sort((a, b) => a.coverageRatio - b.coverageRatio)[0]
    if (worst.coverageRatio < 1 - 1e-9) {
      diagnostics.unshift(
        `${worst.buffName} 覆盖率 ${(worst.coverageRatio * 100).toFixed(0)}%` +
          (worst.missedActionIndexes.length
            ? `（漏动 ${worst.missedActionIndexes.join(',')}）`
            : ''),
      )
    }
  }

  return { base, events, coverage, diagnostics }
}

export const BUFF_PRESET_TEMPLATES: Array<
  Omit<BuffRule, 'sourceActorId'> & { label: string }
> = [
  {
    id: 'harmony-skill',
    label: '同谐战技窗',
    name: '同谐战技增伤',
    durationKind: 'sourceTurns',
    duration: 2,
    coversCarry: true,
    note: '自身每动刷新，持续 2 回合',
  },
  {
    id: 'harmony-ult',
    label: '同谐终结技窗',
    name: '同谐终结技增伤',
    triggerActions: [2],
    asUlt: true,
    durationKind: 'sourceTurns',
    duration: 2,
    coversCarry: true,
    note: '第 2 动视为终结技',
  },
  {
    id: 'nihility-def',
    label: '虚无减防窗',
    name: '虚无减防',
    durationKind: 'av',
    duration: 100,
    coversCarry: true,
    note: '约 100 AV 的减防窗口',
  },
  {
    id: 'rm-window',
    label: '长同谐窗',
    name: '阮梅向增伤',
    durationKind: 'sourceTurns',
    duration: 3,
    coversCarry: true,
    note: '3 回合同谐窗口',
  },
]
