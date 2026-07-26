const WIKI =
  'https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F'

const ZONES = [
  {
    title: '基础伤害',
    formula: '属性值 × (基础倍率 + 倍率修正)',
    tips: '属性值多为攻击力，也可能是生命/防御。多段属性加算后再乘倍率。',
  },
  {
    title: '暴击',
    formula: '非暴击 ×1；暴击 ×(1+暴伤)；期望 = 1 + 暴率×暴伤',
    tips: '暴率按上限 100% 计。经典 DOT 不吃暴击；附加伤害可按来源选择是否暴击。详见「技能轮次」页。',
  },
  {
    title: '伤害加成',
    formula: '1 + Σ增伤',
    tips: '文案含「造成的伤害提高」「属性伤害提高」等，同类加算。',
  },
  {
    title: '防御减免',
    formula: '(200+10×攻方等级) / (同式 + 敌防×(1−减防−无视防))',
    tips: '减防与无视防御加算，总和上限约 100%。同级无减防时约 50%。',
  },
  {
    title: '抗性修正',
    formula: '1 − 抗性 + 降抗 + 抗穿（夹在约 10%～200%）',
    tips: '弱点抗性多为 0，非弱点常见 20%。无原神式「负抗减半」。',
  },
  {
    title: '易伤修正',
    formula: '1 + Σ易伤',
    tips: '文案多为「受到的伤害提高」——加在敌人头上，与增伤不同乘区。',
  },
  {
    title: '减伤修正',
    formula: '∏(1 − 各减伤) ；有韧性时另含约 ×0.9',
    tips: '破韧后去掉韧性减伤。虚弱等独立减伤在此乘算。',
  },
]

export function FormulaPage() {
  return (
    <div className="nb-formula">
      <section className="nb-panel">
        <h2 className="nb-panel__title">伤害公式</h2>
        <p className="nb-panel__hint">
          主干对齐灰机 Wiki。P0 只覆盖<strong>常规直伤</strong>。
        </p>

        <div className="nb-formula__hero">
          <code>
            最终伤害 ＝ 基础伤害 × 伤害加成 × 防御减免 × 抗性修正 × 易伤修正 × 减伤修正
          </code>
          <p>
            暴击作为命中修正乘在基础伤害侧（本工具提供期望 / 强制暴击 / 非暴击）。
          </p>
        </div>

        <div className="nb-formula__grid">
          {ZONES.map((z) => (
            <article key={z.title} className="nb-formula__card">
              <h3>{z.title}</h3>
              <code>{z.formula}</code>
              <p>{z.tips}</p>
            </article>
          ))}
        </div>

        <div className="nb-formula__warn">
          <h3>常见误区</h3>
          <ul>
            <li>
              <strong>增伤 ≠ 易伤</strong>：一个加自己，一个加敌人，两个乘区，不要叠成一个百分比。
            </li>
            <li>
              <strong>减防 + 无视防</strong>：星铁里加算，不是原神式乘算稀释。
            </li>
            <li>
              <strong>破韧</strong>：主要影响韧性减伤与击破伤害；不自动清零属性抗性。
            </li>
          </ul>
          <p>
            原文：{' '}
            <a href={WIKI} target="_blank" rel="noreferrer">
              灰机 Wiki · 伤害计算公式
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
