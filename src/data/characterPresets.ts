import type { AttackerInput } from '../engine/types'

/** Simplified combat panel presets for filling the calculator (hand-tunable after load). */
export interface CharacterPreset {
  id: string
  name: string
  element: string
  path: string
  note: string
  attacker: Omit<AttackerInput, never> & {
    /** Display helpers kept as rates (0–1+). */
  }
  /** Skill label shown in UI. */
  skillLabel: string
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'generic-hunt',
    name: '通用巡猎主C',
    element: '任意',
    path: '巡猎',
    note: '偏暴击面板的通用起点',
    skillLabel: '战技 / 终结技（示例 200%）',
    attacker: {
      level: 80,
      attributeValue: 2800,
      baseMultiplier: 2.0,
      multiplierBonus: 0,
      critRate: 0.7,
      critDamage: 1.4,
      damageBonus: 0.488,
      resPen: 0,
      defIgnore: 0,
    },
  },
  {
    id: 'generic-destruction',
    name: '通用毁灭主C',
    element: '任意',
    path: '毁灭',
    note: '攻暴均衡，倍率略高',
    skillLabel: '终结技（示例 280%）',
    attacker: {
      level: 80,
      attributeValue: 2600,
      baseMultiplier: 2.8,
      multiplierBonus: 0,
      critRate: 0.65,
      critDamage: 1.2,
      damageBonus: 0.388,
      resPen: 0,
      defIgnore: 0,
    },
  },
  {
    id: 'generic-erudition',
    name: '通用智识主C',
    element: '任意',
    path: '智识',
    note: '群攻向，单段倍率中等',
    skillLabel: '战技单段（示例 160%）',
    attacker: {
      level: 80,
      attributeValue: 2700,
      baseMultiplier: 1.6,
      multiplierBonus: 0,
      critRate: 0.68,
      critDamage: 1.3,
      damageBonus: 0.488,
      resPen: 0,
      defIgnore: 0,
    },
  },
  {
    id: 'seele-like',
    name: '量子加速主C（希儿向）',
    element: '量子',
    path: '巡猎',
    note: '高倍率终结技 + 量子球示例',
    skillLabel: '终结技（示例 270%）',
    attacker: {
      level: 80,
      attributeValue: 3000,
      baseMultiplier: 2.7,
      multiplierBonus: 0,
      critRate: 0.8,
      critDamage: 1.6,
      damageBonus: 0.728,
      resPen: 0,
      defIgnore: 0,
    },
  },
]
