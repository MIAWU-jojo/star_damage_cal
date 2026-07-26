import { calculateDamage } from './damage'
import type { AttackerInput, BuffInput, CritMode, DamageInput, DefenderInput } from './types'
import type { SupportBuffs, SupportPreset } from '../data/supportPresets'

export interface AggregatedTeamBuffs {
  damageBonus: number
  vulnerability: number
  defReduction: number
  resReduction: number
  atkPercent: number
  critRate: number
  critDamage: number
  sources: Array<{ id: string; name: string; zones: SupportPreset['zones'] }>
}

export type CoverageLevel = 'none' | 'low' | 'ok' | 'high'

export interface ZoneCoverage {
  id: 'bonus' | 'vuln' | 'def' | 'res' | 'crit' | 'atk'
  label: string
  value: number
  level: CoverageLevel
}

export interface GapDiagnosis {
  weakestZoneId: ZoneCoverage['id']
  message: string
  suggestion: string
}

export interface SwapCandidateResult {
  replaceSlot: number
  outgoingId: string
  incomingId: string
  incomingName: string
  damage: number
  gainRatio: number
  addedZones: SupportPreset['zones']
}

function sumBuffs(supports: SupportPreset[]): AggregatedTeamBuffs {
  const acc: AggregatedTeamBuffs = {
    damageBonus: 0,
    vulnerability: 0,
    defReduction: 0,
    resReduction: 0,
    atkPercent: 0,
    critRate: 0,
    critDamage: 0,
    sources: [],
  }

  for (const s of supports) {
    const b: SupportBuffs = s.buffs
    acc.damageBonus += b.damageBonus
    acc.vulnerability += b.vulnerability
    acc.defReduction += b.defReduction
    acc.resReduction += b.resReduction
    acc.atkPercent += b.atkPercent
    acc.critRate += b.critRate
    acc.critDamage += b.critDamage
    acc.sources.push({ id: s.id, name: s.name, zones: s.zones })
  }

  // DEF shred / ignore style effects are capped at 100% in the damage engine,
  // but we keep raw sum here for coverage display and clamp when building input.
  return acc
}

export function aggregateSupports(supports: SupportPreset[]): AggregatedTeamBuffs {
  return sumBuffs(supports)
}

function coverageLevel(value: number, thresholds: [number, number, number]): CoverageLevel {
  const [low, ok, high] = thresholds
  if (value <= 0) return 'none'
  if (value < low) return 'low'
  if (value < ok) return 'ok'
  if (value >= high) return 'high'
  return 'ok'
}

export function buildCoverage(agg: AggregatedTeamBuffs): ZoneCoverage[] {
  return [
    {
      id: 'bonus',
      label: '增伤',
      value: agg.damageBonus,
      level: coverageLevel(agg.damageBonus, [0.2, 0.5, 0.9]),
    },
    {
      id: 'vuln',
      label: '易伤',
      value: agg.vulnerability,
      level: coverageLevel(agg.vulnerability, [0.15, 0.3, 0.5]),
    },
    {
      id: 'def',
      label: '减防',
      value: agg.defReduction,
      level: coverageLevel(agg.defReduction, [0.2, 0.4, 0.6]),
    },
    {
      id: 'res',
      label: '降抗',
      value: agg.resReduction,
      level: coverageLevel(agg.resReduction, [0.1, 0.2, 0.35]),
    },
    {
      id: 'crit',
      label: '暴击辅助',
      value: agg.critRate + agg.critDamage,
      level: coverageLevel(agg.critRate + agg.critDamage, [0.15, 0.35, 0.6]),
    },
    {
      id: 'atk',
      label: '攻击辅助',
      value: agg.atkPercent,
      level: coverageLevel(agg.atkPercent, [0.2, 0.4, 0.7]),
    },
  ]
}

const ZONE_PRIORITY: ZoneCoverage['id'][] = ['def', 'vuln', 'res', 'bonus', 'crit', 'atk']

export function diagnoseGaps(coverage: ZoneCoverage[]): GapDiagnosis {
  // Prefer diagnosing empty offensive shred zones first.
  const ranked = [...coverage].sort((a, b) => {
    const score = (z: ZoneCoverage) => {
      const emptyBoost = z.level === 'none' ? 0 : z.level === 'low' ? 1 : 2
      const pri = ZONE_PRIORITY.indexOf(z.id)
      return emptyBoost * 10 + pri
    }
    return score(a) - score(b)
  })

  const weakest = ranked[0]
  const messages: Record<ZoneCoverage['id'], { message: string; suggestion: string }> = {
    def: {
      message: '减防几乎为空——防御乘区仍在吃满怪防。',
      suggestion: '优先考虑佩拉 / 银狼等减防位。',
    },
    vuln: {
      message: '易伤缺口明显——受到伤害提高类 Buff 不足。',
      suggestion: '可补阮·梅 / 椒丘等易伤向辅助。',
    },
    res: {
      message: '降抗/抗穿偏少——抗性乘区还有空间。',
      suggestion: '银狼、阮·梅或主C自带抗穿可补。',
    },
    bonus: {
      message: '增伤覆盖偏低。',
      suggestion: '同谐增伤位（停云 / 花火 / 知更鸟）收益通常直接。',
    },
    crit: {
      message: '队伍提供的暴击向增益较少。',
      suggestion: '花火 / 知更鸟或主C自己堆暴即可。',
    },
    atk: {
      message: '攻击%辅助偏少（若主C吃攻击）。',
      suggestion: '停云 / 艾丝妲 / 藿藿等可补攻%。',
    },
  }

  const copy = messages[weakest.id]
  return {
    weakestZoneId: weakest.id,
    message: copy.message,
    suggestion: copy.suggestion,
  }
}

export function applyTeamToAttacker(
  base: AttackerInput,
  agg: AggregatedTeamBuffs,
): AttackerInput {
  return {
    ...base,
    attributeValue: base.attributeValue * (1 + Math.max(0, agg.atkPercent)),
    damageBonus: base.damageBonus + agg.damageBonus,
    critRate: Math.min(1, base.critRate + agg.critRate),
    critDamage: base.critDamage + agg.critDamage,
  }
}

export function applyTeamToBuffs(agg: AggregatedTeamBuffs): BuffInput {
  return {
    vulnerability: agg.vulnerability,
    defReduction: Math.min(1, agg.defReduction),
    resReduction: agg.resReduction,
    damageTakenReductions: [],
  }
}

export function teamDamage(args: {
  attacker: AttackerInput
  defender: DefenderInput
  supports: SupportPreset[]
  critMode?: CritMode
}): number {
  const agg = aggregateSupports(args.supports)
  const input: DamageInput = {
    critMode: args.critMode ?? 'expected',
    attacker: applyTeamToAttacker(args.attacker, agg),
    defender: args.defender,
    buffs: applyTeamToBuffs(agg),
  }
  return calculateDamage(input).finalDamage
}

/**
 * Try replacing each filled support slot with each candidate not already on the team.
 * Rank by expected damage gain vs current team.
 */
export function optimizeSingleSwap(args: {
  attacker: AttackerInput
  defender: DefenderInput
  team: SupportPreset[]
  candidates: SupportPreset[]
  critMode?: CritMode
  topN?: number
}): SwapCandidateResult[] {
  const { attacker, defender, team, candidates, critMode = 'expected', topN = 8 } = args
  const baseline = teamDamage({ attacker, defender, supports: team, critMode })
  const onTeam = new Set(team.map((t) => t.id))
  const results: SwapCandidateResult[] = []

  for (let slot = 0; slot < team.length; slot++) {
    const outgoing = team[slot]
    for (const incoming of candidates) {
      if (onTeam.has(incoming.id)) continue
      const nextTeam = team.map((s, i) => (i === slot ? incoming : s))
      const damage = teamDamage({ attacker, defender, supports: nextTeam, critMode })
      results.push({
        replaceSlot: slot,
        outgoingId: outgoing.id,
        incomingId: incoming.id,
        incomingName: incoming.name,
        damage,
        gainRatio: baseline > 0 ? damage / baseline - 1 : 0,
        addedZones: incoming.zones,
      })
    }
  }

  return results
    .filter((r) => r.gainRatio > 0.001)
    .sort((a, b) => b.gainRatio - a.gainRatio)
    .slice(0, topN)
}
