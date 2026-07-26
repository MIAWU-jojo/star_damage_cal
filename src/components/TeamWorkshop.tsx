import { useMemo, useState } from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import { ENEMY_TEMPLATES } from '../data/enemyTemplates'
import { SUPPORT_PRESETS, getSupport, type SupportPreset } from '../data/supportPresets'
import {
  aggregateSupports,
  buildCoverage,
  diagnoseGaps,
  optimizeSingleSwap,
  teamDamage,
  type CoverageLevel,
} from '../engine/team'

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function formatGain(ratio: number): string {
  const pct = ratio * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

const LEVEL_CLASS: Record<CoverageLevel, string> = {
  none: 'is-none',
  low: 'is-low',
  ok: 'is-ok',
  high: 'is-high',
}

const DEFAULT_TEAM_IDS = ['tingyun', 'pela', 'huohuo']

export function TeamWorkshop() {
  const [carryId, setCarryId] = useState(CHARACTER_PRESETS[0].id)
  const [enemyId, setEnemyId] = useState(ENEMY_TEMPLATES[0].id)
  const [slotIds, setSlotIds] = useState<string[]>(DEFAULT_TEAM_IDS)
  const [poolIds, setPoolIds] = useState<string[]>(() =>
    SUPPORT_PRESETS.filter((s) => !DEFAULT_TEAM_IDS.includes(s.id)).map((s) => s.id),
  )

  const carry = CHARACTER_PRESETS.find((c) => c.id === carryId) ?? CHARACTER_PRESETS[0]
  const enemy = ENEMY_TEMPLATES.find((e) => e.id === enemyId) ?? ENEMY_TEMPLATES[0]

  const team = useMemo(
    () =>
      slotIds
        .map((id) => getSupport(id))
        .filter((s): s is SupportPreset => Boolean(s)),
    [slotIds],
  )

  const pool = useMemo(
    () =>
      poolIds
        .map((id) => getSupport(id))
        .filter((s): s is SupportPreset => Boolean(s)),
    [poolIds],
  )

  const agg = useMemo(() => aggregateSupports(team), [team])
  const coverage = useMemo(() => buildCoverage(agg), [agg])
  const gap = useMemo(() => diagnoseGaps(coverage), [coverage])

  const damage = useMemo(() => {
    return teamDamage({
      attacker: carry.attacker,
      defender: {
        level: enemy.level,
        defense: enemy.defense,
        resistance: enemy.resistance,
        hasToughness: enemy.hasToughness,
      },
      supports: team,
    })
  }, [carry, enemy, team])

  const swaps = useMemo(() => {
    return optimizeSingleSwap({
      attacker: carry.attacker,
      defender: {
        level: enemy.level,
        defense: enemy.defense,
        resistance: enemy.resistance,
        hasToughness: enemy.hasToughness,
      },
      team,
      candidates: pool,
      topN: 6,
    })
  }, [carry, enemy, team, pool])

  const survivalWarnings = team.filter((s) => s.isSurvival)

  const setSlot = (index: number, id: string) => {
    setSlotIds((prev) => {
      const next = [...prev]
      const old = next[index]
      next[index] = id
      setPoolIds((poolPrev) => {
        let updated = poolPrev.filter((x) => x !== id)
        if (old && !next.includes(old) && !updated.includes(old)) {
          updated = [...updated, old]
        }
        return updated
      })
      return next
    })
  }

  const togglePool = (id: string) => {
    setPoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="nb-layout">
      <section className="nb-panel">
        <h2 className="nb-panel__title">配队工坊</h2>
        <p className="nb-panel__hint">
          固定主 C，汇总辅助乘区；在候选池里<strong>只换 1 人</strong>找伤害提升。
        </p>

        <div className="nb-section">
          <div className="nb-section__label">主 C 预设</div>
          <div className="nb-field">
            <label htmlFor="team-carry">角色</label>
            <select
              id="team-carry"
              value={carryId}
              onChange={(e) => setCarryId(e.target.value)}
            >
              {CHARACTER_PRESETS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.path}
                </option>
              ))}
            </select>
          </div>
          <p className="nb-template-note">
            {carry.note} · {carry.skillLabel}
          </p>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">敌人</div>
          <div className="nb-field">
            <label htmlFor="team-enemy">模板</label>
            <select
              id="team-enemy"
              value={enemyId}
              onChange={(e) => setEnemyId(e.target.value)}
            >
              {ENEMY_TEMPLATES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">当前三人辅</div>
          <div className="nb-grid">
            {slotIds.map((id, index) => (
              <div className="nb-field" key={`slot-${index}`}>
                <label htmlFor={`slot-${index}`}>辅助 {index + 1}</label>
                <select
                  id={`slot-${index}`}
                  value={id}
                  onChange={(e) => setSlot(index, e.target.value)}
                >
                  {SUPPORT_PRESETS.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={slotIds.includes(s.id) && s.id !== id}
                    >
                      {s.name}
                      {s.isSurvival ? '（生存）' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {survivalWarnings.length > 0 && (
            <p className="nb-template-note">
              生存位警告：{survivalWarnings.map((s) => s.name).join('、')}{' '}
              —— 不参与「最优输出」叙事，仅保留生存功能。
            </p>
          )}
        </div>

        <div className="nb-section">
          <div className="nb-section__label">候选池（勾选才参与替换搜索）</div>
          <div className="nb-pool">
            {SUPPORT_PRESETS.filter((s) => !slotIds.includes(s.id)).map((s) => {
              const checked = poolIds.includes(s.id)
              return (
                <label key={s.id} className={`nb-pool__item${checked ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePool(s.id)}
                  />
                  <span>
                    {s.name}
                    {s.isSurvival ? ' · 生存' : ''}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </section>

      <section className="nb-panel nb-result">
        <h2 className="nb-panel__title">乘区与替换</h2>
        <p className="nb-panel__hint">期望直伤（预设面板 × 队伍 Buff）。数值为简化模型。</p>

        <div className="nb-damage">
          <span className="nb-damage__label">队伍期望伤害</span>
          <span key={damage.toFixed(1)} className="nb-damage__value">
            {formatInt(damage)}
          </span>
        </div>

        <div className="nb-section__label">乘区覆盖</div>
        <div className="nb-coverage">
          {coverage.map((z) => (
            <div key={z.id} className={`nb-coverage__cell ${LEVEL_CLASS[z.level]}`}>
              <strong>{z.label}</strong>
              <span>{formatPct(z.value)}</span>
              <em>
                {z.level === 'none'
                  ? '空'
                  : z.level === 'low'
                    ? '薄'
                    : z.level === 'high'
                      ? '厚'
                      : '有'}
              </em>
            </div>
          ))}
        </div>

        <div className="nb-gap">
          <div className="nb-section__label">缺口诊断</div>
          <p>
            <strong>{gap.message}</strong>
          </p>
          <p>{gap.suggestion}</p>
        </div>

        <div className="nb-section__label">单人替换 Top</div>
        {swaps.length === 0 ? (
          <p className="nb-template-note">候选池为空，或当前队已无明显单换提升。</p>
        ) : (
          <ul className="nb-marginals">
            {swaps.map((s) => (
              <li key={`${s.replaceSlot}-${s.incomingId}`}>
                <span>
                  换下辅助{s.replaceSlot + 1} → <strong>{s.incomingName}</strong>
                  {s.addedZones.length > 0 && (
                    <em className="nb-swap-zones"> · 补 {s.addedZones.join('/')}</em>
                  )}
                </span>
                <span className="nb-swap-actions">
                  <strong>{formatGain(s.gainRatio)}</strong>
                  <button
                    type="button"
                    className="nb-btn"
                    onClick={() => setSlot(s.replaceSlot, s.incomingId)}
                  >
                    应用
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="nb-section__label">Buff 来源</div>
        <ul className="nb-sources">
          {agg.sources.map((s) => (
            <li key={s.id}>
              {s.name}
              {s.zones.length > 0 ? ` — ${s.zones.join(', ')}` : ' — 无输出乘区'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
