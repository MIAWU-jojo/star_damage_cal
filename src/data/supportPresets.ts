/**
 * Support / buffer presets.
 * Values are simplified combat approximations for P1 team workshop — not full kit parsers.
 */

export type SupportRole = 'harmony' | 'nihility' | 'abundance' | 'preservation' | 'other'

export interface SupportBuffs {
  /** Additive DMG% to the carry. */
  damageBonus: number
  vulnerability: number
  defReduction: number
  resReduction: number
  /** Extra ATK% roughly folded into attribute bump for workshop (optional). */
  atkPercent: number
  critRate: number
  critDamage: number
}

export interface SupportPreset {
  id: string
  name: string
  role: SupportRole
  element: string
  /** Survival-slot warning only — does not score damage. */
  isSurvival: boolean
  note: string
  buffs: SupportBuffs
  /** Which zones this support primarily fills (for coverage UI). */
  zones: Array<'bonus' | 'vuln' | 'def' | 'res' | 'crit' | 'atk'>
}

export const SUPPORT_PRESETS: SupportPreset[] = [
  {
    id: 'tingyun',
    name: '停云',
    role: 'harmony',
    element: '雷',
    isSurvival: false,
    note: '攻% + 增伤（简化）',
    buffs: {
      damageBonus: 0.5,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0.5,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['bonus', 'atk'],
  },
  {
    id: 'ruan-mei',
    name: '阮·梅',
    role: 'harmony',
    element: '冰',
    isSurvival: false,
    note: '增伤 + 抗穿 + 易伤向（简化）',
    buffs: {
      damageBonus: 0.36,
      vulnerability: 0.25,
      defReduction: 0,
      resReduction: 0.25,
      atkPercent: 0,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['bonus', 'vuln', 'res'],
  },
  {
    id: 'robin',
    name: '知更鸟',
    role: 'harmony',
    element: '物理',
    isSurvival: false,
    note: '暴伤 + 增伤（简化）',
    buffs: {
      damageBonus: 0.3,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0.2,
      critRate: 0,
      critDamage: 0.3,
    },
    zones: ['bonus', 'crit', 'atk'],
  },
  {
    id: 'sparkle',
    name: '花火',
    role: 'harmony',
    element: '量子',
    isSurvival: false,
    note: '暴伤 + 增伤（简化）',
    buffs: {
      damageBonus: 0.45,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0.15,
      critRate: 0,
      critDamage: 0.4,
    },
    zones: ['bonus', 'crit', 'atk'],
  },
  {
    id: 'pela',
    name: '佩拉',
    role: 'nihility',
    element: '冰',
    isSurvival: false,
    note: '减防核心',
    buffs: {
      damageBonus: 0,
      vulnerability: 0,
      defReduction: 0.4,
      resReduction: 0,
      atkPercent: 0,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['def'],
  },
  {
    id: 'silver-wolf',
    name: '银狼',
    role: 'nihility',
    element: '量子',
    isSurvival: false,
    note: '减防 + 降抗（简化）',
    buffs: {
      damageBonus: 0,
      vulnerability: 0,
      defReduction: 0.45,
      resReduction: 0.2,
      atkPercent: 0,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['def', 'res'],
  },
  {
    id: 'jiaoqiu',
    name: '椒丘',
    role: 'nihility',
    element: '火',
    isSurvival: false,
    note: '易伤向（简化）',
    buffs: {
      damageBonus: 0,
      vulnerability: 0.35,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['vuln'],
  },
  {
    id: 'aste',
    name: '艾丝妲',
    role: 'harmony',
    element: '火',
    isSurvival: false,
    note: '攻% 向（简化）',
    buffs: {
      damageBonus: 0,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0.55,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['atk'],
  },
  {
    id: 'fu-xuan',
    name: '符玄',
    role: 'preservation',
    element: '量子',
    isSurvival: true,
    note: '生存位；少量暴击（简化）',
    buffs: {
      damageBonus: 0,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0,
      critRate: 0.12,
      critDamage: 0,
    },
    zones: ['crit'],
  },
  {
    id: 'huohuo',
    name: '藿藿',
    role: 'abundance',
    element: '风',
    isSurvival: true,
    note: '生存位；攻%（简化）',
    buffs: {
      damageBonus: 0,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0.4,
      critRate: 0,
      critDamage: 0,
    },
    zones: ['atk'],
  },
  {
    id: 'luocha',
    name: '罗刹',
    role: 'abundance',
    element: '虚数',
    isSurvival: true,
    note: '纯生存位，几乎无输出乘区',
    buffs: {
      damageBonus: 0,
      vulnerability: 0,
      defReduction: 0,
      resReduction: 0,
      atkPercent: 0,
      critRate: 0,
      critDamage: 0,
    },
    zones: [],
  },
]

export function getSupport(id: string): SupportPreset | undefined {
  return SUPPORT_PRESETS.find((s) => s.id === id)
}
