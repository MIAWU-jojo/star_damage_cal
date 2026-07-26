import type {
  AttackerInput,
  BuffInput,
  CritMode,
  DamageInput,
  DamageResult,
  DefenderInput,
  MarginalGain,
  ZoneBreakdown,
} from './types'

/** Clamp RES zone per Huiji wiki: min 10%, max 200%. */
export function clampResistanceZone(value: number): number {
  return Math.min(2, Math.max(0.1, value))
}

export function resolveDefense(defender: DefenderInput): number {
  if (defender.defense != null && Number.isFinite(defender.defense)) {
    return Math.max(0, defender.defense)
  }
  return defender.level * 10 + 200
}

/**
 * Crit zone:
 * - noncrit → 1
 * - crit → 1 + CDMG
 * - expected → 1 + CRIT_RATE * CDMG (CRIT_RATE capped at 1)
 */
export function critZone(mode: CritMode, critRate: number, critDamage: number): number {
  const rate = Math.min(Math.max(critRate, 0), 1)
  const cdmg = Math.max(critDamage, 0)
  if (mode === 'noncrit') return 1
  if (mode === 'crit') return 1 + cdmg
  return 1 + rate * cdmg
}

/**
 * DEF mitigation (wiki form):
 * defenseMitigation = 1 - DEF / (DEF + 200 + 10 * attackerLevel)
 * with DEF after shred: DEF * max(0, 1 - defReduction - defIgnore)
 */
export function defenseZone(
  attackerLevel: number,
  rawDefense: number,
  defReduction: number,
  defIgnore: number,
): number {
  const shred = Math.min(Math.max(defReduction + defIgnore, 0), 1)
  const effectiveDef = Math.max(0, rawDefense * (1 - shred))
  const constant = 200 + 10 * attackerLevel
  return constant / (constant + effectiveDef)
}

export function resistanceZone(
  resistance: number,
  resReduction: number,
  resPen: number,
): number {
  return clampResistanceZone(1 - resistance + resReduction + resPen)
}

export function reductionZone(
  hasToughness: boolean,
  damageTakenReductions: number[],
): number {
  const toughness = hasToughness ? 0.9 : 1
  return damageTakenReductions.reduce((acc, r) => {
    const clamped = Math.min(Math.max(r, 0), 0.99)
    return acc * (1 - clamped)
  }, toughness)
}

function zoneShare(values: number[]): number[] {
  const logs = values.map((v) => Math.log(Math.max(v, 1e-9)))
  const min = Math.min(...logs)
  const shifted = logs.map((l) => l - min + 0.15)
  const sum = shifted.reduce((a, b) => a + b, 0)
  return shifted.map((s) => s / sum)
}

function withDelta(input: DamageInput, patch: Partial<{
  attacker: Partial<AttackerInput>
  defender: Partial<DefenderInput>
  buffs: Partial<BuffInput>
}>): DamageInput {
  return {
    critMode: input.critMode,
    attacker: { ...input.attacker, ...patch.attacker },
    defender: { ...input.defender, ...patch.defender },
    buffs: {
      ...input.buffs,
      damageTakenReductions: [
        ...(patch.buffs?.damageTakenReductions ?? input.buffs.damageTakenReductions),
      ],
      vulnerability: patch.buffs?.vulnerability ?? input.buffs.vulnerability,
      defReduction: patch.buffs?.defReduction ?? input.buffs.defReduction,
      resReduction: patch.buffs?.resReduction ?? input.buffs.resReduction,
    },
  }
}

function computeCore(input: DamageInput) {
  const { attacker, defender, buffs, critMode } = input
  const multiplier = Math.max(0, attacker.baseMultiplier + attacker.multiplierBonus)
  const baseDamage = Math.max(0, attacker.attributeValue) * multiplier
  const crit = critZone(critMode, attacker.critRate, attacker.critDamage)
  const dmgBonus = 1 + Math.max(0, attacker.damageBonus)
  const def = defenseZone(
    attacker.level,
    resolveDefense(defender),
    buffs.defReduction,
    attacker.defIgnore,
  )
  const res = resistanceZone(defender.resistance, buffs.resReduction, attacker.resPen)
  const vuln = 1 + Math.max(0, buffs.vulnerability)
  const redu = reductionZone(defender.hasToughness, buffs.damageTakenReductions)

  const finalDamage = baseDamage * crit * dmgBonus * def * res * vuln * redu

  return {
    baseDamage,
    critMultiplier: crit,
    damageBonusZone: dmgBonus,
    defenseZone: def,
    resistanceZone: res,
    vulnerabilityZone: vuln,
    reductionZone: redu,
    finalDamage,
  }
}

/**
 * Direct-damage calculator aligned with Huiji wiki zones:
 * Final = Base × DMG Bonus × DEF Mit × RES × Vulnerability × Reduction
 * Crit is applied as a multiplier on the hit (expected / force crit / non-crit).
 */
export function calculateDamage(input: DamageInput): DamageResult {
  const core = computeCore(input)

  const zoneValues = [
    core.baseDamage,
    core.critMultiplier,
    core.damageBonusZone,
    core.defenseZone,
    core.resistanceZone,
    core.vulnerabilityZone,
    core.reductionZone,
  ]
  const shares = zoneShare(zoneValues)

  const zones: ZoneBreakdown[] = [
    { id: 'base', label: '基础伤害', value: core.baseDamage, share: shares[0] },
    { id: 'crit', label: '暴击乘区', value: core.critMultiplier, share: shares[1] },
    { id: 'bonus', label: '伤害加成', value: core.damageBonusZone, share: shares[2] },
    { id: 'def', label: '防御减免', value: core.defenseZone, share: shares[3] },
    { id: 'res', label: '抗性修正', value: core.resistanceZone, share: shares[4] },
    { id: 'vuln', label: '易伤修正', value: core.vulnerabilityZone, share: shares[5] },
    { id: 'redu', label: '减伤修正', value: core.reductionZone, share: shares[6] },
  ]

  const baseFinal = Math.max(core.finalDamage, 1e-9)
  const trials: Array<{ id: string; label: string; next: DamageInput }> = [
    {
      id: 'bonus',
      label: '再加 10% 增伤',
      next: withDelta(input, {
        attacker: { damageBonus: input.attacker.damageBonus + 0.1 },
      }),
    },
    {
      id: 'vuln',
      label: '再加 10% 易伤',
      next: withDelta(input, {
        buffs: { vulnerability: input.buffs.vulnerability + 0.1 },
      }),
    },
    {
      id: 'def',
      label: '再加 10% 减防',
      next: withDelta(input, {
        buffs: { defReduction: input.buffs.defReduction + 0.1 },
      }),
    },
    {
      id: 'res',
      label: '再加 10% 降抗/抗穿',
      next: withDelta(input, {
        buffs: { resReduction: input.buffs.resReduction + 0.1 },
      }),
    },
    {
      id: 'break',
      label: '破韧（去掉韧性减伤）',
      next: withDelta(input, { defender: { hasToughness: false } }),
    },
  ]

  const marginals: MarginalGain[] = trials.map((t) => {
    const nextDmg = computeCore(t.next).finalDamage
    return {
      id: t.id,
      label: t.label,
      gainRatio: nextDmg / baseFinal - 1,
    }
  }).sort((a, b) => b.gainRatio - a.gainRatio)

  return {
    ...core,
    zones,
    marginals,
  }
}
