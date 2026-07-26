# star_damage_cal

崩坏·星穹铁道 **直伤计算器**（P0 MVP）· **Neo Brutalism** UI。

公式依据：[灰机 Wiki · 伤害计算公式](https://starrail.huijiwiki.com/wiki/%E4%BC%A4%E5%AE%B3%E8%AE%A1%E7%AE%97%E5%85%AC%E5%BC%8F)

## 功能（P0）

- 常规直伤：基础 × 暴击 × 增伤 × 防御 × 抗性 × 易伤 × 减伤
- 期望 / 暴击 / 非暴击 三种模式
- 敌人模板 + 手动 Buff
- 乘区拆解与 +10% 边际收益

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

## 设计约束

Neo Brutalism 硬约束：[`docs/ui-neobrutalism.md`](docs/ui-neobrutalism.md)

关键词：粗黑边、硬阴影（无模糊）、扁平高对比色块、超大标题、禁止渐变。

## 结构

| 路径 | 说明 |
|------|------|
| `src/engine/` | 纯函数伤害引擎 |
| `src/components/Calculator.tsx` | 计算器 UI |
| `src/styles/` | Neo Brutalism tokens / global |
| `docs/ui-neobrutalism.md` | UI 风格约束 |
