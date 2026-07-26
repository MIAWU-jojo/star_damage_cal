/**
 * Multi-support combo search (limited enumerate / greedy) + team compare.
 */

import type { SupportEffect } from './domain'
import {
  aggregateSupports,
  buildCoverage,
  teamDamage,
  type CoverageLevel,
  type ZoneCoverage,
} from './team'
import type { AttackerInput, CritMode, DefenderInput } from './types'

export interface TeamComboResult {
  supportIds: string[]
  supportNames: string[]
  damage: number
  coverage: ZoneCoverage[]
  survivalCount: number
}

export interface TeamCompareRow {
  label: string
  supportIds: string[]
  supportNames: string[]
  damage: number
  coverageSummary: string
  brokenHint: string
  survivalCount: number
}

function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = []
  const n = arr.length
  if (k <= 0 || k > n) return out
  const idx = Array.from({ length: k }, (_, i) => i)
  const push = () => out.push(idx.map((i) => arr[i]))
  push()
  while (true) {
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) break
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
    push()
  }
  return out
}

function scoreCombo(args: {
  attacker: AttackerInput
  defender: DefenderInput
  supports: SupportEffect[]
  critMode: CritMode
}): TeamComboResult {
  const damage = teamDamage({
    attacker: args.attacker,
    defender: args.defender,
    supports: args.supports,
    critMode: args.critMode,
  })
  const agg = aggregateSupports(args.supports)
  return {
    supportIds: args.supports.map((s) => s.id),
    supportNames: args.supports.map((s) => s.name),
    damage,
    coverage: buildCoverage(agg),
    survivalCount: args.supports.filter((s) => s.isSurvival).length,
  }
}

/**
 * Search top support triplets from a candidate pool.
 * Enumerates C(n,3) when small; otherwise greedy pairwise growth.
 */
export function searchSupportCombos(args: {
  attacker: AttackerInput
  defender: DefenderInput
  pool: SupportEffect[]
  teamSize?: number
  topN?: number
  critMode?: CritMode
  /** Soft-penalize survival-only seats in ranking. */
  penalizeSurvival?: boolean
}): TeamComboResult[] {
  const teamSize = args.teamSize ?? 3
  const topN = args.topN ?? 8
  const critMode = args.critMode ?? 'expected'
  const pool = args.pool
  if (pool.length < teamSize) return []

  const comboCount =
    (pool.length * (pool.length - 1) * (pool.length - 2)) / 6
  const useEnumerate = comboCount <= 220 || pool.length <= 12

  let results: TeamComboResult[] = []

  if (useEnumerate) {
    const combos = combinations(pool, teamSize)
    results = combos.map((supports) =>
      scoreCombo({
        attacker: args.attacker,
        defender: args.defender,
        supports,
        critMode,
      }),
    )
  } else {
    // Greedy beam: seed with best singles, expand
    const singles = [...pool]
      .map((s) =>
        scoreCombo({
          attacker: args.attacker,
          defender: args.defender,
          supports: [s],
          critMode,
        }),
      )
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 6)

    let beam: SupportEffect[][] = singles.map((s) =>
      s.supportIds.map((id) => pool.find((p) => p.id === id)!),
    )

    while (beam[0] && beam[0].length < teamSize) {
      const next: SupportEffect[][] = []
      for (const team of beam) {
        const on = new Set(team.map((t) => t.id))
        for (const cand of pool) {
          if (on.has(cand.id)) continue
          next.push([...team, cand])
        }
      }
      beam = next
        .map((supports) => ({
          supports,
          damage: teamDamage({
            attacker: args.attacker,
            defender: args.defender,
            supports,
            critMode,
          }),
        }))
        .sort((a, b) => b.damage - a.damage)
        .slice(0, 24)
        .map((x) => x.supports)
    }

    results = beam.map((supports) =>
      scoreCombo({
        attacker: args.attacker,
        defender: args.defender,
        supports,
        critMode,
      }),
    )
  }

  const ranked = results
    .map((r) => ({
      ...r,
      rankScore:
        r.damage *
        (args.penalizeSurvival && r.survivalCount >= 2 ? 0.92 : 1),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)

  // Dedupe by sorted id key
  const seen = new Set<string>()
  const unique: TeamComboResult[] = []
  for (const r of ranked) {
    const key = [...r.supportIds].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(r)
    if (unique.length >= topN) break
  }
  return unique
}

function coverageCompact(coverage: ZoneCoverage[]): string {
  const mark = (lv: CoverageLevel) =>
    lv === 'none' ? '空' : lv === 'low' ? '薄' : lv === 'high' ? '厚' : '有'
  return coverage.map((z) => `${z.label}${mark(z.level)}`).join(' · ')
}

export function compareTeams(args: {
  attacker: AttackerInput
  defender: DefenderInput
  teams: Array<{ label: string; supports: SupportEffect[] }>
  critMode?: CritMode
}): TeamCompareRow[] {
  const critMode = args.critMode ?? 'expected'
  return args.teams.map((t) => {
    const row = scoreCombo({
      attacker: args.attacker,
      defender: args.defender,
      supports: t.supports,
      critMode,
    })
    const broken = args.defender.hasToughness
      ? '未破韧（×0.9）'
      : '已破韧'
    return {
      label: t.label,
      supportIds: row.supportIds,
      supportNames: row.supportNames,
      damage: row.damage,
      coverageSummary: coverageCompact(row.coverage),
      brokenHint: broken,
      survivalCount: row.survivalCount,
    }
  })
}
