import { BuildPage } from './components/BuildPage'
import { Calculator } from './components/Calculator'
import { FormulaPage } from './components/FormulaPage'
import { RotationPage } from './components/RotationPage'
import { TeamWorkshop } from './components/TeamWorkshop'
import { useHashRoute, type AppRoute } from './hooks/useHashRoute'

const NAV: Array<{ id: AppRoute; label: string }> = [
  { id: 'calc', label: '伤害计算' },
  { id: 'team', label: '配队工坊' },
  { id: 'rotation', label: '技能轮次' },
  { id: 'build', label: '构筑建议' },
  { id: 'formula', label: '公式说明' },
]

export default function App() {
  const [route, setRoute] = useHashRoute()

  return (
    <div className="nb-app">
      <header>
        <nav className="nb-nav" aria-label="主导航">
          <div className="nb-nav__links">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className="nb-nav__btn"
                aria-current={route === item.id ? 'page' : undefined}
                onClick={() => setRoute(item.id)}
              >
                {item.label}
              </button>
            ))}
            <a
              href="https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F"
              target="_blank"
              rel="noreferrer"
            >
              Wiki
            </a>
          </div>
        </nav>

        <h1 className="nb-brand">
          Star <span>Damage</span>
        </h1>
        <p className="nb-lead">
          崩坏·星穹铁道直伤 / DOT / 击破演算与配队乘区对照。按灰机 Wiki
          <strong>硬拆伤害</strong>，看清该补增伤、减防还是降抗。
        </p>
      </header>

      <main>
        {route === 'calc' && <Calculator />}
        {route === 'team' && <TeamWorkshop />}
        {route === 'rotation' && <RotationPage />}
        {route === 'build' && <BuildPage />}
        {route === 'formula' && <FormulaPage />}
      </main>

      <footer className="nb-footer">
        见 <code>TODO.md</code> 路线图 · UI 约束 <code>docs/ui-neobrutalism.md</code> · 公式{' '}
        <a
          href="https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F"
          target="_blank"
          rel="noreferrer"
        >
          灰机 Wiki
        </a>
        。
      </footer>
    </div>
  )
}
