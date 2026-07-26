/** Combat elements used for weakness filtering in team workshop. */
export const ELEMENTS = [
  '物理',
  '火',
  '冰',
  '雷',
  '风',
  '量子',
  '虚数',
] as const

export type Element = (typeof ELEMENTS)[number]

export interface EnemyTemplate {
  id: string
  name: string
  level: number
  defense?: number
  /** Default RES when hitting a non-weakness element. */
  resistance: number
  hasToughness: boolean
  note: string
  /** Known weakness elements for this template (empty = user-defined). */
  weaknesses: Element[]
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id: 'equal-weak',
    name: '同级 · 弱点属性',
    level: 80,
    resistance: 0,
    hasToughness: true,
    note: '抗性 0%，未破韧（韧性减伤 10%）',
    weaknesses: ['量子', '冰'],
  },
  {
    id: 'equal-nonweak',
    name: '同级 · 非弱点',
    level: 80,
    resistance: 0.2,
    hasToughness: true,
    note: '抗性 20%，未破韧',
    weaknesses: [],
  },
  {
    id: 'equal-broken',
    name: '同级 · 已破韧',
    level: 80,
    resistance: 0,
    hasToughness: false,
    note: '弱点属性，破韧后无韧性减伤',
    weaknesses: ['火', '雷'],
  },
  {
    id: 'boss-extra-res',
    name: '精英 · 额外抗性',
    level: 90,
    resistance: 0.4,
    hasToughness: true,
    note: '高等级 + 高抗，用来压测降抗收益',
    weaknesses: ['虚数'],
  },
  {
    id: 'moc-weak',
    name: '混沌回忆 · 弱点',
    level: 95,
    resistance: 0,
    hasToughness: true,
    note: '高等级同防推算，弱点属性',
    weaknesses: ['物理', '风', '量子'],
  },
  {
    id: 'pf-aoe',
    name: '虚构叙事 · 杂兵',
    level: 85,
    resistance: 0.2,
    hasToughness: true,
    note: '非弱点杂兵档，便于测群攻倍率',
    weaknesses: ['火', '冰'],
  },
  {
    id: 'as-boss',
    name: '末日幻影 · 首领',
    level: 90,
    resistance: 0.2,
    hasToughness: true,
    note: '首领向：非弱点 + 有韧性',
    weaknesses: ['雷', '虚数'],
  },
  {
    id: 'custom',
    name: '自定义敌人',
    level: 80,
    resistance: 0.2,
    hasToughness: true,
    note: '手动改等级 / 防御 / 抗性 / 弱点',
    weaknesses: [],
  },
]
