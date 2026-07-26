import { useEffect, useMemo, useState } from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import {
  ELEMENTS,
  ENEMY_TEMPLATES,
  type Element,
} from '../data/enemyTemplates'
import {
  SUPPORT_PRESETS,
  getSupport,
  matchesWeaknessConstraint,
  type SupportPreset,
} from '../data/supportPresets'
import {
  aggregateSupports,
  buildCoverage,
  diagnoseGaps,
  optimizeSingleSwap,
  teamDamage,
  type CoverageLevel,
} from '../engine/team'
import { compareTeams, searchSupportCombos } from '../engine/teamSearch'
import { useWorkspace } from '../state/WorkspaceContext'

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
  const {
    carryPresetId: carryId,
    setCarryPresetId: setCarryId,
    enemyTemplateId: enemyId,
    setEnemyTemplateId: setEnemyId,
    teamSlotIds: slotIds,
    setTeamSlotIds: setSlotIds,
  } = useWorkspace()
  const [poolIds, setPoolIds] = useState<string[]>(() =>
    SUPPORT_PRESETS.filter((s) => !DEFAULT_TEAM_IDS.includes(s.id)).map((s) => s.id),
  )
  const [weaknesses, setWeaknesses] = useState<Element[]>(
    () => [...ENEMY_TEMPLATES[0].weaknesses],
  )
  const [filterByWeakness, setFilterByWeakness] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  useEffect(() => {
    setPoolIds((prev) => {
      const kept = prev.filter((id) => !slotIds.includes(id))
      const extras = SUPPORT_PRESETS.map((s) => s.id).filter(
        (id) => !slotIds.includes(id) && !kept.includes(id),
      )
      // Keep previous selection for still-valid ids; add missing off-team supports unchecked? 
      // Prefer: pool = all not on team that were previously on, plus default off-team.
      return [...new Set([...kept, ...extras.filter((id) => prev.includes(id) || !slotIds.includes(id))])].filter(
        (id) => !slotIds.includes(id),
      )
    })
  }, [slotIds])

  const carry = CHARACTER_PRESETS.find((c) => c.id === carryId) ?? CHARACTER_PRESETS[0]
  const enemy = ENEMY_TEMPLATES.find((e) => e.id === enemyId) ?? ENEMY_TEMPLATES[0]

  useEffect(() => {
    setWeaknesses([...enemy.weaknesses])
  }, [enemy])

  const team = useMemo(
    () =>
      slotIds
        .map((id) => getSupport(id))
        .filter((s): s is SupportPreset => Boolean(s)),
    [slotIds],
  )

  const visibleSupports = useMemo(() => {
    if (!filterByWeakness) return SUPPORT_PRESETS
    return SUPPORT_PRESETS.filter((s) => matchesWeaknessConstraint(s, weaknesses))
  }, [filterByWeakness, weaknesses])

  const pool = useMemo(
    () =>
      poolIds
        .map((id) => getSupport(id))
        .filter((s): s is SupportPreset => Boolean(s))
        .filter((s) => !filterByWeakness || matchesWeaknessConstraint(s, weaknesses)),
    [filterByWeakness, poolIds, weaknesses],
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

  const searchPool = useMemo(() => {
    const base = filterByWeakness
      ? SUPPORT_PRESETS.filter((s) => matchesWeaknessConstraint(s, weaknesses))
      : SUPPORT_PRESETS
    return base.filter((s) => poolIds.includes(s.id) || slotIds.includes(s.id))
  }, [filterByWeakness, poolIds, slotIds, weaknesses])

  const comboResults = useMemo(() => {
    return searchSupportCombos({
      attacker: carry.attacker,
      defender: {
        level: enemy.level,
        defense: enemy.defense,
        resistance: enemy.resistance,
        hasToughness: enemy.hasToughness,
      },
      pool: searchPool.length >= 3 ? searchPool : SUPPORT_PRESETS.filter((s) => !s.isSurvival),
      topN: 6,
      penalizeSurvival: true,
    })
  }, [carry, enemy, searchPool])

  const compareRows = useMemo(() => {
    const teams = [
      {
        label: '当前队',
        supports: team,
      },
      ...compareIds.map((key, i) => {
        const ids = key.split('|')
        return {
          label: `候选 ${i + 1}`,
          supports: ids
            .map((id) => getSupport(id))
            .filter((s): s is SupportPreset => Boolean(s)),
        }
      }),
    ]
    return compareTeams({
      attacker: carry.attacker,
      defender: {
        level: enemy.level,
        defense: enemy.defense,
        resistance: enemy.resistance,
        hasToughness: enemy.hasToughness,
      },
      teams,
    })
  }, [carry, compareIds, enemy, team])

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

  const toggleWeakness = (el: Element) => {
    setWeaknesses((prev) =>
      prev.includes(el) ? prev.filter((x) => x !== el) : [...prev, el],
    )
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
          <div className="nb-section__label">属性弱点</div>
          <div className="nb-pool" role="group" aria-label="敌人弱点">
            {ELEMENTS.map((el) => {
              const on = weaknesses.includes(el)
              return (
                <label key={el} className={`nb-pool__item${on ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleWeakness(el)}
                  />
                  <span>{el}</span>
                </label>
              )
            })}
          </div>
          <label className="nb-check" style={{ marginTop: '0.75rem' }}>
            <input
              type="checkbox"
              checked={filterByWeakness}
              onChange={(e) => setFilterByWeakness(e.target.checked)}
            />
            仅显示同属性 / 可植入弱点的辅助（候选池与替换搜索）
          </label>
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
                      {s.implantsWeakness ? '（植入）' : ''}
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
            {visibleSupports
              .filter((s) => !slotIds.includes(s.id))
              .map((s) => {
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
                      {s.implantsWeakness ? ' · 植入' : ''}
                      {` · ${s.element}`}
                    </span>
                  </label>
                )
              })}
          </div>
          {filterByWeakness && visibleSupports.length < SUPPORT_PRESETS.length && (
            <p className="nb-template-note">
              弱点过滤已开启：隐藏 {SUPPORT_PRESETS.length - visibleSupports.length}{' '}
              名不符属性的辅助。
            </p>
          )}
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

        <div className="nb-section__label">三人辅组合搜索</div>
        <p className="nb-template-note">
          在候选池（含当前队员）内搜索 Top 组合；池过大时自动改贪心束搜索。
        </p>
        {comboResults.length === 0 ? (
          <p className="nb-template-note">候选不足 3 人。</p>
        ) : (
          <ul className="nb-marginals">
            {comboResults.map((c) => {
              const key = [...c.supportIds].sort().join('|')
              const onCompare = compareIds.includes(key)
              return (
                <li key={key}>
                  <span>
                    {c.supportNames.join(' + ')}
                    {c.survivalCount > 0 ? ` · 生存${c.survivalCount}` : ''}
                  </span>
                  <span className="nb-swap-actions">
                    <strong>{formatInt(c.damage)}</strong>
                    <button
                      type="button"
                      className="nb-btn"
                      onClick={() => {
                        setSlotIds(c.supportIds)
                        setPoolIds((prev) => [
                          ...new Set([
                            ...prev.filter((id) => !c.supportIds.includes(id)),
                            ...slotIds.filter((id) => !c.supportIds.includes(id)),
                          ]),
                        ])
                      }}
                    >
                      应用
                    </button>
                    <button
                      type="button"
                      className="nb-btn"
                      onClick={() =>
                        setCompareIds((prev) =>
                          onCompare ? prev.filter((x) => x !== key) : [...prev, key].slice(-3),
                        )
                      }
                    >
                      {onCompare ? '移出对比' : '加入对比'}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <div className="nb-section__label">配队对比</div>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>队伍</th>
                <th>期望伤害</th>
                <th>乘区覆盖</th>
                <th>破韧</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label + row.supportIds.join('-')}>
                  <td>
                    <strong>{row.label}</strong>
                    <div className="nb-table__sub">{row.supportNames.join(' · ') || '—'}</div>
                  </td>
                  <td>{formatInt(row.damage)}</td>
                  <td>{row.coverageSummary}</td>
                  <td>{row.brokenHint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
