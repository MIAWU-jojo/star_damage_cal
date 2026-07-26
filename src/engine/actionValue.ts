/**
 * Action Value (AV) / speed timeline engine (P4.1).
 * Track length 10000; MoC cycle budgets: first 150, then 100 each.
 */

export const TRACK_LENGTH = 10000
export const FIRST_CYCLE_BUDGET = 150
export const LATER_CYCLE_BUDGET = 100

export interface AvActor {
  id: string
  name: string
  /** Combat speed (can be fractional). */
  speed: number
  /**
   * Flat AV advance applied when entering the next lap after an action
   * (and optionally at battle start). 0.2 = 20% 拉条 → start at 8000 distance.
   */
  advanceOnReset?: number
  /** If true, also apply advanceOnReset at battle start. */
  advanceAtStart?: boolean
  role?: 'carry' | 'support' | 'survival' | 'enemy' | 'other'
}

export interface TimelineEvent {
  time: number
  actorId: string
  actorName: string
  actionIndex: number
  cycle: number
  /** Remaining AV of this actor right before acting (≈ 0). */
  avAtAct: number
}

export interface ActorCycleStats {
  actorId: string
  name: string
  speed: number
  actionsPerCycle: number[]
  totalActions: number
}

export interface TimelineResult {
  events: TimelineEvent[]
  /** Absolute AV timestamps of cycle ends (150, 250, …). */
  cycleEnds: number[]
  stats: ActorCycleStats[]
  endTime: number
}

export interface BreakpointRow {
  id: string
  label: string
  cycles: number
  actions: number
  minSpeed: number
}

/** AV until next action from remaining distance and speed. */
export function avFromDistance(distance: number, speed: number): number {
  const spd = Math.max(speed, 1e-9)
  return Math.max(0, distance) / spd
}

/** Full-lap AV = 10000 / SPD. */
export function lapAv(speed: number): number {
  return avFromDistance(TRACK_LENGTH, speed)
}

export function cycleBudget(cycleIndex: number): number {
  return cycleIndex <= 0 ? FIRST_CYCLE_BUDGET : LATER_CYCLE_BUDGET
}

/** Total AV budget for the first `cycles` MoC cycles (1-based count). */
export function totalBudgetForCycles(cycles: number): number {
  const n = Math.max(1, Math.floor(cycles))
  return FIRST_CYCLE_BUDGET + LATER_CYCLE_BUDGET * (n - 1)
}

/**
 * Minimum speed to finish `actions` full laps within the first `cycles` budgets.
 * SPD = (10000 * actions) / budget.
 */
export function minSpeedForActions(cycles: number, actions: number): number {
  const a = Math.max(0, actions)
  if (a === 0) return 0
  return (TRACK_LENGTH * a) / totalBudgetForCycles(cycles)
}

/** How many full actions fit in the first `cycles` if speed is constant (no pull). */
export function actionsInCycles(speed: number, cycles: number): number {
  const budget = totalBudgetForCycles(cycles)
  const lap = lapAv(speed)
  if (lap <= 0) return 0
  return Math.floor(budget / lap + 1e-9)
}

export const COMMON_BREAKPOINTS: BreakpointRow[] = [
  {
    id: 'c1a2',
    label: '首轮 2 动',
    cycles: 1,
    actions: 2,
    minSpeed: minSpeedForActions(1, 2),
  },
  {
    id: 'c2a3',
    label: '前 2 轮 3 动',
    cycles: 2,
    actions: 3,
    minSpeed: minSpeedForActions(2, 3),
  },
  {
    id: 'c2a4',
    label: '前 2 轮 4 动',
    cycles: 2,
    actions: 4,
    minSpeed: minSpeedForActions(2, 4),
  },
  {
    id: 'c3a4',
    label: '前 3 轮 4 动',
    cycles: 3,
    actions: 4,
    minSpeed: minSpeedForActions(3, 4),
  },
  {
    id: 'c3a5',
    label: '前 3 轮 5 动',
    cycles: 3,
    actions: 5,
    minSpeed: minSpeedForActions(3, 5),
  },
  {
    id: 'c1a3',
    label: '首轮 3 动',
    cycles: 1,
    actions: 3,
    minSpeed: minSpeedForActions(1, 3),
  },
]

function clampAdvance(v: number | undefined): number {
  if (v == null || !Number.isFinite(v)) return 0
  return Math.min(0.99, Math.max(0, v))
}

function startDistance(actor: AvActor): number {
  if (actor.advanceAtStart) {
    return TRACK_LENGTH * (1 - clampAdvance(actor.advanceOnReset))
  }
  return TRACK_LENGTH
}

function resetDistance(actor: AvActor): number {
  const adv = clampAdvance(actor.advanceOnReset)
  return TRACK_LENGTH * (1 - adv)
}

function cycleIndexAtTime(time: number, cycleEnds: number[]): number {
  // Inclusive upper bound: an action at exactly cycleEnds[i] still belongs
  // to cycle i (e.g. 133.333… SPD second act at AV 150 → 首轮 2 动).
  for (let i = 0; i < cycleEnds.length; i++) {
    if (time <= cycleEnds[i] + 1e-9) return i
  }
  return Math.max(0, cycleEnds.length - 1)
}

/**
 * Discrete-event AV timeline for multiple actors until `cycles` MoC cycles end
 * (or `maxEvents` actions globally).
 */
export function simulateTimeline(args: {
  actors: AvActor[]
  cycles?: number
  maxEvents?: number
}): TimelineResult {
  const cycles = Math.max(1, args.cycles ?? 2)
  const maxEvents = args.maxEvents ?? 80
  const cycleEnds: number[] = []
  let acc = 0
  for (let i = 0; i < cycles; i++) {
    acc += cycleBudget(i)
    cycleEnds.push(acc)
  }
  const endTime = cycleEnds[cycleEnds.length - 1]

  type State = {
    actor: AvActor
    distance: number
    actionCount: number
    actionsPerCycle: number[]
  }

  const states: State[] = args.actors
    .filter((a) => a.speed > 0 && a.name.trim() !== '')
    .map((actor) => ({
      actor,
      distance: startDistance(actor),
      actionCount: 0,
      actionsPerCycle: Array.from({ length: cycles }, () => 0),
    }))

  const events: TimelineEvent[] = []
  let time = 0

  while (events.length < maxEvents && time < endTime - 1e-9) {
    let bestIdx = -1
    let bestEta = Infinity
    for (let i = 0; i < states.length; i++) {
      const s = states[i]
      const eta = avFromDistance(s.distance, s.actor.speed)
      if (eta < bestEta - 1e-12) {
        bestEta = eta
        bestIdx = i
      } else if (Math.abs(eta - bestEta) <= 1e-12 && bestIdx >= 0) {
        // Tie-break: higher speed first, then name
        const cur = states[bestIdx]
        if (
          s.actor.speed > cur.actor.speed + 1e-12 ||
          (Math.abs(s.actor.speed - cur.actor.speed) <= 1e-12 &&
            s.actor.name.localeCompare(cur.actor.name) < 0)
        ) {
          bestIdx = i
        }
      }
    }
    if (bestIdx < 0 || !Number.isFinite(bestEta)) break

    const nextTime = time + bestEta
    if (nextTime > endTime + 1e-9) break

    // Advance all distances
    for (const s of states) {
      s.distance = Math.max(0, s.distance - s.actor.speed * bestEta)
    }

    time = nextTime
    const s = states[bestIdx]
    s.distance = 0
    s.actionCount += 1
    const cyc = cycleIndexAtTime(time, cycleEnds)
    if (cyc >= 0 && cyc < s.actionsPerCycle.length) {
      s.actionsPerCycle[cyc] += 1
    }

    events.push({
      time,
      actorId: s.actor.id,
      actorName: s.actor.name,
      actionIndex: s.actionCount,
      cycle: cyc + 1,
      avAtAct: 0,
    })

    s.distance = resetDistance(s.actor)
  }

  return {
    events,
    cycleEnds,
    endTime,
    stats: states.map((s) => ({
      actorId: s.actor.id,
      name: s.actor.name,
      speed: s.actor.speed,
      actionsPerCycle: s.actionsPerCycle,
      totalActions: s.actionCount,
    })),
  }
}

export interface OrderCheckResult {
  ok: boolean
  message: string
  /** Suggested minimum speed gap (faster - slower) if failing early order. */
  suggestedGap?: number
}

/**
 * Check that `beforeId` takes their 1st action before `afterId`'s 1st action.
 */
export function checkFirstActionOrder(
  timeline: TimelineResult,
  beforeId: string,
  afterId: string,
): OrderCheckResult {
  const firstBefore = timeline.events.find((e) => e.actorId === beforeId)
  const firstAfter = timeline.events.find((e) => e.actorId === afterId)
  if (!firstBefore || !firstAfter) {
    return { ok: false, message: '时间线中缺少对照角色的行动。' }
  }
  if (firstBefore.time < firstAfter.time - 1e-9) {
    return {
      ok: true,
      message: `${firstBefore.actorName} 首动早于 ${firstAfter.actorName}（AV ${firstBefore.time.toFixed(2)} < ${firstAfter.time.toFixed(2)}）。`,
    }
  }
  return {
    ok: false,
    message: `${firstBefore.actorName} 未能先于 ${firstAfter.actorName} 首动（AV ${firstBefore.time.toFixed(2)} ≥ ${firstAfter.time.toFixed(2)}）。可尝试拉开 ≥1 速。`,
    suggestedGap: 1,
  }
}

/**
 * Find smallest integer speed for `actorId` (keeping others fixed) so that
 * they get at least `minActions` in the first `cycles` cycles. Brute 1..300.
 */
export function findMinSpeedForActionCount(args: {
  actors: AvActor[]
  actorId: string
  cycles: number
  minActions: number
  speedMax?: number
}): number | null {
  const target = args.actors.find((a) => a.id === args.actorId)
  if (!target) return null
  const max = args.speedMax ?? 300
  for (let spd = 1; spd <= max; spd++) {
    const actors = args.actors.map((a) =>
      a.id === args.actorId ? { ...a, speed: spd } : a,
    )
    const tl = simulateTimeline({ actors, cycles: args.cycles })
    const st = tl.stats.find((s) => s.actorId === args.actorId)
    if (st && st.totalActions >= args.minActions) return spd
  }
  return null
}
