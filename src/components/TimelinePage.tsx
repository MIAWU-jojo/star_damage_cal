import { useEffect, useMemo, useState } from 'react'
import { CHARACTER_PRESETS } from '../data/characterPresets'
import { ENEMY_TEMPLATES } from '../data/enemyTemplates'
import {
  COMMON_BREAKPOINTS,
  checkFirstActionOrder,
  lapAv,
  type AvActor,
} from '../engine/actionValue'
import {
  BUFF_PRESET_TEMPLATES,
  simulateCombatEvents,
  type BuffRule,
} from '../engine/avEvents'
import {
  DEFAULT_LOOP,
  DEFAULT_RESOURCES,
  compareCarrySpeedDamage,
  simulateTimelineCombat,
  type UltStrategy,
} from '../engine/timelineCombat'
import { useWorkspace } from '../state/WorkspaceContext'
import { AvHorizontalTimeline } from './AvHorizontalTimeline'

function formatAv(n: number): string {
  return n.toFixed(2)
}

function formatSpd(n: number): string {
  return n.toFixed(2)
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}

type Slot = {
  id: string
  name: string
  speed: number
  advancePct: number
  advanceAtStart: boolean
  role: AvActor['role']
}

function buildDefaultSlots(
  carryName: string,
  carrySpeed: number,
  supportSpeeds: { s1: number; s2: number; v1: number },
): Slot[] {
  return [
    {
      id: 's1',
      name: '辅助 A',
      speed: supportSpeeds.s1,
      advancePct: 0,
      advanceAtStart: false,
      role: 'support',
    },
    {
      id: 's2',
      name: '辅助 B',
      speed: supportSpeeds.s2,
      advancePct: 0,
      advanceAtStart: false,
      role: 'support',
    },
    {
      id: 'c1',
      name: carryName,
      speed: carrySpeed,
      advancePct: 0,
      advanceAtStart: false,
      role: 'carry',
    },
    {
      id: 'v1',
      name: '生存',
      speed: supportSpeeds.v1,
      advancePct: 0,
      advanceAtStart: false,
      role: 'survival',
    },
  ]
}

export function TimelinePage() {
  const {
    carryPresetId,
    carrySpeed,
    setCarrySpeed,
    supportSpeeds,
    setSupportSpeeds,
    buffRules,
    setBuffRules,
    enemyTemplateId,
    saveSnapshot,
    snapshots,
    loadSnapshot,
    deleteSnapshot,
    encodeShare,
  } = useWorkspace()
  const carryPreset =
    CHARACTER_PRESETS.find((c) => c.id === carryPresetId) ?? CHARACTER_PRESETS[0]
  const enemyTemplate =
    ENEMY_TEMPLATES.find((e) => e.id === enemyTemplateId) ?? ENEMY_TEMPLATES[0]

  const [slots, setSlots] = useState<Slot[]>(() =>
    buildDefaultSlots(carryPreset.name, carrySpeed, supportSpeeds),
  )
  const [enemyOn, setEnemyOn] = useState(false)
  const [enemySpeed, setEnemySpeed] = useState(144)
  const [cycles, setCycles] = useState(2)
  const [orderBefore, setOrderBefore] = useState('s1')
  const [orderAfter, setOrderAfter] = useState('c1')
  const [snapshotName, setSnapshotName] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [addTpl, setAddTpl] = useState(BUFF_PRESET_TEMPLATES[0]?.id ?? '')
  const [addSource, setAddSource] = useState('s1')
  const [settleOn, setSettleOn] = useState(true)
  const [spStart, setSpStart] = useState(DEFAULT_RESOURCES.spStart)
  const [energyStart, setEnergyStart] = useState(0)
  const [ultStrategy, setUltStrategy] = useState<UltStrategy>('buffCovered')
  const [coveredBoostPct, setCoveredBoostPct] = useState(50)

  useEffect(() => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.role === 'carry') {
          return { ...s, name: carryPreset.name, speed: carrySpeed }
        }
        if (s.id === 's1') return { ...s, speed: supportSpeeds.s1 }
        if (s.id === 's2') return { ...s, speed: supportSpeeds.s2 }
        if (s.id === 'v1') return { ...s, speed: supportSpeeds.v1 }
        return s
      }),
    )
  }, [carryPreset.name, carrySpeed, supportSpeeds])

  const actors: AvActor[] = useMemo(() => {
    const list: AvActor[] = slots
      .filter((s) => s.name.trim() && s.speed > 0)
      .map((s) => ({
        id: s.id,
        name: s.name.trim(),
        speed: s.speed,
        role: s.role,
        advanceOnReset: s.advancePct / 100,
        advanceAtStart: s.advanceAtStart,
      }))
    if (enemyOn && enemySpeed > 0) {
      list.push({
        id: 'enemy',
        name: '敌人',
        speed: enemySpeed,
        role: 'enemy',
      })
    }
    return list
  }, [enemyOn, enemySpeed, slots])

  const combat = useMemo(
    () =>
      simulateCombatEvents({
        actors,
        buffs: buffRules,
        cycles,
        carryId: 'c1',
      }),
    [actors, buffRules, cycles],
  )

  const settleInput = useMemo(
    () => ({
      actors,
      buffs: buffRules,
      cycles,
      carryId: 'c1',
      loop: DEFAULT_LOOP,
      resources: {
        ...DEFAULT_RESOURCES,
        spStart,
        energyStart,
        ultStrategy,
        coveredDamageBoost: coveredBoostPct / 100,
      },
      attacker: carryPreset.attacker,
      defender: {
        level: enemyTemplate.level,
        defense: enemyTemplate.defense,
        resistance: enemyTemplate.resistance,
        hasToughness: enemyTemplate.hasToughness,
        maxToughness: 100,
      },
    }),
    [
      actors,
      buffRules,
      carryPreset.attacker,
      coveredBoostPct,
      cycles,
      energyStart,
      enemyTemplate,
      spStart,
      ultStrategy,
    ],
  )

  const settled = useMemo(
    () => (settleOn ? simulateTimelineCombat(settleInput) : null),
    [settleInput, settleOn],
  )

  const speedExplain = useMemo(() => {
    if (!settleOn) return null
    const carry = slots.find((s) => s.role === 'carry')?.speed ?? carrySpeed
    const lo = Math.floor(carry)
    const hi = lo + 1
    const { a, b, deltaRatio } = compareCarrySpeedDamage(settleInput, lo, hi)
    return { lo, hi, a, b, deltaRatio }
  }, [carrySpeed, settleInput, settleOn, slots])

  const timeline = combat.base

  const order = useMemo(
    () => checkFirstActionOrder(timeline, orderBefore, orderAfter),
    [orderAfter, orderBefore, timeline],
  )

  const updateSlot = (id: string, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    if (patch.speed != null) {
      if (id === 'c1') setCarrySpeed(patch.speed)
      if (id === 's1' || id === 's2' || id === 'v1') {
        setSupportSpeeds((prev) => ({ ...prev, [id]: patch.speed! }))
      }
    }
  }

  const addBuffFromTemplate = (templateId: string, sourceActorId: string) => {
    const tpl = BUFF_PRESET_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    const rule: BuffRule = {
      id: `${tpl.id}-${Date.now()}`,
      name: tpl.name,
      sourceActorId,
      triggerActions: tpl.triggerActions,
      asUlt: tpl.asUlt,
      durationKind: tpl.durationKind,
      duration: tpl.duration,
      coversCarry: tpl.coversCarry,
      note: tpl.note,
    }
    setBuffRules((prev) => [...prev, rule])
  }

  const removeBuff = (id: string) => {
    setBuffRules((prev) => prev.filter((b) => b.id !== id))
  }

  const copyShareLink = async () => {
    const encoded = encodeShare()
    const url = `${window.location.origin}${window.location.pathname}?w=${encoded}#/timeline`
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      window.prompt('复制分享链接', url)
    }
  }

  return (
    <div className="nb-timeline-page">
    <div className="nb-layout">
      <section className="nb-panel">
        <h2 className="nb-panel__title">行动条工坊</h2>
        <p className="nb-panel__hint">
          跑道 10000 · 首轮 150 AV、之后每轮 100。事件流标出 Buff 开始/到期与主 C
          覆盖；重点看「为什么乱轴 / 哪里漏覆盖」。
        </p>

        <div className="nb-section">
          <div className="nb-section__label">模拟范围</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="av-cycles">轮次数</label>
              <input
                id="av-cycles"
                type="number"
                min={1}
                max={5}
                value={cycles}
                onChange={(e) => setCycles(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="nb-field">
              <label htmlFor="av-enemy-spd">敌人速度</label>
              <input
                id="av-enemy-spd"
                type="number"
                min={1}
                step={0.1}
                value={enemySpeed}
                disabled={!enemyOn}
                onChange={(e) => setEnemySpeed(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="nb-check">
            <input
              type="checkbox"
              checked={enemyOn}
              onChange={(e) => setEnemyOn(e.target.checked)}
            />
            加入敌人行动（看怪穿插位置）
          </label>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">四人配速</div>
          {slots.map((s) => (
            <div key={s.id} className="nb-av-slot">
              <div className="nb-grid">
                <div className="nb-field">
                  <label htmlFor={`${s.id}-name`}>名称</label>
                  <input
                    id={`${s.id}-name`}
                    value={s.name}
                    onChange={(e) => updateSlot(s.id, { name: e.target.value })}
                  />
                </div>
                <div className="nb-field">
                  <label htmlFor={`${s.id}-spd`}>战斗速度</label>
                  <input
                    id={`${s.id}-spd`}
                    type="number"
                    min={1}
                    step={0.1}
                    value={s.speed}
                    onChange={(e) => {
                      updateSlot(s.id, { speed: Number(e.target.value) })
                    }}
                  />
                </div>
                <div className="nb-field">
                  <label htmlFor={`${s.id}-adv`}>回合后拉条 %</label>
                  <input
                    id={`${s.id}-adv`}
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    value={s.advancePct}
                    onChange={(e) =>
                      updateSlot(s.id, { advancePct: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="nb-field">
                  <label htmlFor={`${s.id}-role`}>定位</label>
                  <select
                    id={`${s.id}-role`}
                    value={s.role}
                    onChange={(e) =>
                      updateSlot(s.id, {
                        role: e.target.value as Slot['role'],
                      })
                    }
                  >
                    <option value="carry">主 C</option>
                    <option value="support">辅助</option>
                    <option value="survival">生存</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
              <p className="nb-template-note">
                满圈 AV ≈ {formatAv(lapAv(Math.max(s.speed, 1)))}
                {s.advancePct > 0
                  ? ` · 拉条后 ≈ ${formatAv(lapAv(Math.max(s.speed, 1)) * (1 - s.advancePct / 100))}`
                  : ''}
              </p>
              <label className="nb-check">
                <input
                  type="checkbox"
                  checked={s.advanceAtStart}
                  onChange={(e) =>
                    updateSlot(s.id, { advanceAtStart: e.target.checked })
                  }
                />
                开场也吃拉条（如进战立即推条）
              </label>
            </div>
          ))}
        </div>

        <div className="nb-section">
          <div className="nb-section__label">Buff 窗口规则</div>
          <p className="nb-panel__hint">
            不解析完整技能：选模板挂到施放者，时间线标出开始/到期与主 C
            覆盖。
          </p>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="buff-tpl">模板</label>
              <select
                id="buff-tpl"
                value={addTpl}
                onChange={(e) => setAddTpl(e.target.value)}
              >
                {BUFF_PRESET_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="nb-field">
              <label htmlFor="buff-src">施放者</label>
              <select
                id="buff-src"
                value={addSource}
                onChange={(e) => setAddSource(e.target.value)}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.id}）
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="nb-btn"
            onClick={() => addBuffFromTemplate(addTpl, addSource)}
          >
            添加 Buff 规则
          </button>
          {buffRules.length === 0 ? (
            <p className="nb-template-note">尚未添加规则。试试「同谐战技窗」挂到辅助 A。</p>
          ) : (
            <ul className="nb-buff-rules">
              {buffRules.map((b) => {
                const src = slots.find((s) => s.id === b.sourceActorId)
                return (
                  <li key={b.id}>
                    <strong>{b.name}</strong>
                    <span className="nb-swap-zones">
                      {' '}
                      · {src?.name ?? b.sourceActorId} ·{' '}
                      {b.durationKind === 'sourceTurns'
                        ? `${b.duration} 回合`
                        : `${b.duration} AV`}
                      {b.coversCarry ? ' · 覆盖主 C' : ''}
                    </span>
                    <button
                      type="button"
                      className="nb-btn nb-btn--ghost"
                      onClick={() => removeBuff(b.id)}
                    >
                      移除
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="nb-section">
          <div className="nb-section__label">时间线 × 轮次结算（P4.3）</div>
          <p className="nb-panel__hint">
            主 C 按默认循环「战技 → 普攻 → 战技」吃行动次数；缺 SP 会降级，Buff
            覆盖加增伤，能量满按策略插终结技。
          </p>
          <label className="nb-check">
            <input
              type="checkbox"
              checked={settleOn}
              onChange={(e) => setSettleOn(e.target.checked)}
            />
            启用轮次伤害结算
          </label>
          {settleOn && (
            <div className="nb-grid" style={{ marginTop: '0.75rem' }}>
              <div className="nb-field">
                <label htmlFor="sp-start">初始战技点</label>
                <input
                  id="sp-start"
                  type="number"
                  min={0}
                  max={5}
                  value={spStart}
                  onChange={(e) => setSpStart(Number(e.target.value))}
                />
              </div>
              <div className="nb-field">
                <label htmlFor="en-start">初始能量</label>
                <input
                  id="en-start"
                  type="number"
                  min={0}
                  max={120}
                  value={energyStart}
                  onChange={(e) => setEnergyStart(Number(e.target.value))}
                />
              </div>
              <div className="nb-field">
                <label htmlFor="ult-strat">终结技策略</label>
                <select
                  id="ult-strat"
                  value={ultStrategy}
                  onChange={(e) => setUltStrategy(e.target.value as UltStrategy)}
                >
                  <option value="buffCovered">Buff 内满能放</option>
                  <option value="immediate">满能立即放</option>
                  <option value="manualOnly">不自动放</option>
                </select>
              </div>
              <div className="nb-field">
                <label htmlFor="cov-boost">覆盖时增伤 %</label>
                <input
                  id="cov-boost"
                  type="number"
                  min={0}
                  max={200}
                  value={coveredBoostPct}
                  onChange={(e) => setCoveredBoostPct(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="nb-section">
          <div className="nb-section__label">首动顺序检查</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="av-before">希望先手</label>
              <select
                id="av-before"
                value={orderBefore}
                onChange={(e) => setOrderBefore(e.target.value)}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="nb-field">
              <label htmlFor="av-after">希望后手</label>
              <select
                id="av-after"
                value={orderAfter}
                onChange={(e) => setOrderAfter(e.target.value)}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={`nb-order ${order.ok ? 'is-ok' : 'is-bad'}`}>
            {order.message}
          </p>
        </div>

        <div className="nb-section">
          <div className="nb-section__label">方案快照 / 分享</div>
          <div className="nb-grid">
            <div className="nb-field">
              <label htmlFor="snap-name">快照名</label>
              <input
                id="snap-name"
                value={snapshotName}
                placeholder="如 134 首轮 2 动"
                onChange={(e) => setSnapshotName(e.target.value)}
              />
            </div>
          </div>
          <div className="nb-btn-row">
            <button
              type="button"
              className="nb-btn"
              onClick={() => {
                saveSnapshot(snapshotName)
                setSnapshotName('')
              }}
            >
              保存快照
            </button>
            <button type="button" className="nb-btn nb-btn--ghost" onClick={copyShareLink}>
              {shareCopied ? '已复制链接' : '复制分享链接'}
            </button>
          </div>
          {snapshots.length > 0 && (
            <ul className="nb-buff-rules">
              {snapshots.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>
                  <span className="nb-swap-zones">
                    {' '}
                    · {new Date(s.savedAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="nb-btn nb-btn--ghost"
                    onClick={() => loadSnapshot(s.id)}
                  >
                    加载
                  </button>
                  <button
                    type="button"
                    className="nb-btn nb-btn--ghost"
                    onClick={() => deleteSnapshot(s.id)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="nb-panel nb-result">
        <h2 className="nb-panel__title">结算摘要</h2>
        <p className="nb-panel__hint">
          结束于 AV {formatAv(timeline.endTime)}（前 {cycles} 轮）· 事件{' '}
          {combat.events.length} 条。下方为横向时间轴。
        </p>

        <div className="nb-damage nb-sticky-summary">
          <span className="nb-damage__label">
            {settled
              ? '时间线总伤'
              : combat.coverage.length > 0
                ? 'Buff 覆盖'
                : '行动事件'}
          </span>
          <span
            key={
              settled
                ? settled.totalDamage.toFixed(1)
                : `${combat.coverage.length > 0 ? Math.min(...combat.coverage.map((c) => c.coverageRatio)).toFixed(3) : timeline.events.length}`
            }
            className="nb-damage__value"
          >
            {settled
              ? formatInt(settled.totalDamage)
              : combat.coverage.length > 0
                ? `${(Math.min(...combat.coverage.map((c) => c.coverageRatio)) * 100).toFixed(0)}%`
                : String(timeline.events.length)}
          </span>
        </div>

        {settled && (
          <>
            <div className="nb-section__label">分轮总伤</div>
            <div className="nb-substats">
              {settled.damageByCycle.map((d, i) => (
                <div key={i}>
                  <span>{i === 0 ? '0T' : `${i}T`}</span>
                  <strong>{formatInt(d)}</strong>
                </div>
              ))}
              <div>
                <span>合计</span>
                <strong>{formatInt(settled.totalDamage)}</strong>
              </div>
            </div>
            {(settled.skillsDowngraded > 0 ||
              settled.ultCasts > 0 ||
              settled.spOverflowTotal > 0) && (
              <p className="nb-template-note">
                战技降级 {settled.skillsDowngraded} · 自动终结技{' '}
                {settled.ultCasts} · SP 溢出 {settled.spOverflowTotal}
                {settled.endedBroken ? ' · 已破韧' : ''}
              </p>
            )}
            {speedExplain && (
              <p className={`nb-order ${speedExplain.deltaRatio >= 0 ? 'is-ok' : 'is-bad'}`}>
                速度 {speedExplain.lo}→{speedExplain.hi}：总伤{' '}
                {formatInt(speedExplain.a.totalDamage)} →{' '}
                {formatInt(speedExplain.b.totalDamage)}（
                {speedExplain.deltaRatio >= 0 ? '+' : ''}
                {(speedExplain.deltaRatio * 100).toFixed(1)}%
                ）· 行动 {speedExplain.a.hits.length}→{speedExplain.b.hits.length}
                {speedExplain.b.skillsDowngraded > speedExplain.a.skillsDowngraded
                  ? ` · 多动带来更多缺 SP 降级`
                  : ''}
              </p>
            )}
            <div className="nb-section__label">结算命中</div>
            <div className="nb-table-wrap">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>AV</th>
                    <th>行动</th>
                    <th>伤害</th>
                    <th>SP</th>
                    <th>能量</th>
                  </tr>
                </thead>
                <tbody>
                  {settled.hits.map((h, i) => (
                    <tr key={`${h.time}-${h.label}-${i}`}>
                      <td>{formatAv(h.time)}</td>
                      <td>
                        <strong>{h.label}</strong>
                        {h.covered ? (
                          <span className="nb-av-tag is-cover"> 盖</span>
                        ) : buffRules.some((b) => b.coversCarry) ? (
                          <span className="nb-av-tag is-miss"> 漏</span>
                        ) : null}
                        {h.note ? (
                          <div className="nb-table__sub">{h.note}</div>
                        ) : null}
                      </td>
                      <td>{formatInt(h.damage)}</td>
                      <td>
                        {h.spBefore}→{h.spAfter}
                      </td>
                      <td>
                        {Math.round(h.energyBefore)}→{Math.round(h.energyAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(settled?.diagnostics.length || combat.diagnostics.length) > 0 && (
          <>
            <div className="nb-section__label">诊断</div>
            <ul className="nb-diag-list">
              {(settled?.diagnostics ?? combat.diagnostics).map((d, i) => (
                <li key={`${i}-${d}`} className="nb-diag-list__item is-warn">
                  {d}
                </li>
              ))}
            </ul>
          </>
        )}

        {combat.coverage.length > 0 && (
          <>
            <div className="nb-section__label">Buff 覆盖主 C</div>
            <div className="nb-table-wrap">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Buff</th>
                    <th>覆盖</th>
                    <th>漏动</th>
                  </tr>
                </thead>
                <tbody>
                  {combat.coverage.map((c) => (
                    <tr key={c.buffId}>
                      <td>
                        <strong>{c.buffName}</strong>
                      </td>
                      <td
                        className={
                          c.coverageRatio >= 1 - 1e-9 ? 'nb-ok' : 'nb-bad'
                        }
                      >
                        {c.carryActionsCovered}/{c.carryActionsTotal}（
                        {(c.coverageRatio * 100).toFixed(0)}%）
                      </td>
                      <td>
                        {c.missedActionIndexes.length
                          ? c.missedActionIndexes.join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="nb-section__label">每轮行动次数</div>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>角色</th>
                <th>速度</th>
                {Array.from({ length: cycles }, (_, i) => (
                  <th key={i}>第 {i + 1} 轮</th>
                ))}
                <th>合计</th>
              </tr>
            </thead>
            <tbody>
              {timeline.stats.map((s) => (
                <tr key={s.actorId}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{formatSpd(s.speed)}</td>
                  {s.actionsPerCycle.map((n, i) => (
                    <td key={i}>{n}</td>
                  ))}
                  <td>
                    <strong>{s.totalActions}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="nb-section__label">常用速度阈值</div>
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>目标</th>
                <th>最低速度</th>
                <th>主 C 是否达标</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_BREAKPOINTS.map((b) => {
                const carry = slots.find((s) => s.role === 'carry') ?? slots[2]
                const ok = carry.speed + 1e-9 >= b.minSpeed
                return (
                  <tr key={b.id}>
                    <td>{b.label}</td>
                    <td>{formatSpd(b.minSpeed)}</td>
                    <td className={ok ? 'nb-ok' : 'nb-bad'}>
                      {ok ? '达标' : '未达标'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section className="nb-panel nb-hrail-panel">
      <h2 className="nb-panel__title">事件时间线</h2>
      <AvHorizontalTimeline
        combat={combat}
        actors={actors}
        cycles={cycles}
      />
    </section>
    </div>
  )
}
