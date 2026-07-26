import { Calculator } from './components/Calculator'

export default function App() {
  return (
    <div className="nb-app">
      <header>
        <nav className="nb-nav" aria-label="主导航">
          <div className="nb-nav__links">
            <span aria-current="page">伤害计算</span>
            <span className="is-muted">配队工坊 · 稍后</span>
            <a
              href="https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F"
              target="_blank"
              rel="noreferrer"
            >
              公式来源
            </a>
          </div>
        </nav>

        <h1 className="nb-brand">
          Star <span>Damage</span>
        </h1>
        <p className="nb-lead">
          崩坏·星穹铁道直伤演算。按灰机 Wiki 乘区<strong>硬拆伤害</strong>
          ，对照增伤 / 减防 / 降抗谁更赚。
        </p>
      </header>

      <main>
        <Calculator />
      </main>

      <footer className="nb-footer">
        P0 · 常规直伤。公式参考{' '}
        <a
          href="https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F"
          target="_blank"
          rel="noreferrer"
        >
          灰机 Wiki · 伤害计算公式
        </a>
        。UI 约束见 <code>docs/ui-neobrutalism.md</code>。
      </footer>
    </div>
  )
}
