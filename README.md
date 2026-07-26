# star_damage_cal

崩坏·星穹铁道 **直伤计算器 + 配队工坊**（Neo Brutalism UI）。

公式依据：[灰机 Wiki · 伤害计算公式](https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F)

## 功能

- **伤害计算** `#/`：直伤乘区拆解、边际收益、主 C 预设、分享链接
- **配队工坊** `#/team`：辅助 Buff 汇总、乘区覆盖、缺口诊断、单人替换优化
- **公式说明** `#/formula`：Wiki 主干与常见误区

未完成项见 [`TODO.md`](TODO.md)。

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

## 设计约束

[`docs/ui-neobrutalism.md`](docs/ui-neobrutalism.md) — 粗黑边、硬阴影、扁平高对比、禁止渐变。
