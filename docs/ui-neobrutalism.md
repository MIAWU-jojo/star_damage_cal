# Neo Brutalism UI 风格约束（Neubrutalism）

> 本文件是 `star_damage_cal` 的视觉与交互硬约束。后续所有页面、组件、动效必须遵守。  
> 参考：[Neubrutalism.com](https://neubrutalism.com/) · [NN/G Neobrutalism](https://www.nngroup.com/articles/neobrutalism/)

---

## 1. 一句话定位

**露骨的盒子。**  
粗黑描边、零模糊硬阴影、高对比色块、超大标题——界面像被盖章、丝网印刷，而不是玻璃拟态或柔和 SaaS。

---

## 2. 视觉 DNA（必须全部具备）

| 元素 | 规则 | 典型值 |
|------|------|--------|
| 描边 | 厚实、纯黑、全程一致 | `border: 3px solid #000` |
| 阴影 | 硬偏移、无模糊、纯色 | `box-shadow: 4px 4px 0 #000` |
| 圆角 | 接近直角；最多轻微 | `0` 或 `≤ 4px` |
| 颜色 | 扁平纯色块，**禁止渐变** | 1 个底 + 黑结构 + 1～3 强调色 |
| 字体 | 超大展示字 + 冷静正文字 | 展示用粗无衬线；正文清晰可读 |
| 布局 | 块状、可略不对称，但有网格 | broken but not random |

---

## 3. 必须做到

- **品牌优先**：首屏品牌名是英雄级字号，不能只缩在导航
- **结构可见**：面板/按钮/输入框必须靠粗边框被“框死”，不要靠淡分割线
- **高对比**：黑字浅底或浅字深块，对比要敢用
- **一区一事**：每个区块一个目的、一个标题、一句说明
- **留白**：粗框之间要有呼吸；密不等于 Neo Brutalism

---

## 4. 明确禁止

- 柔和多层阴影、`blur`、玻璃拟态、渐变填充（含背景渐变装饰）
- 大圆角卡片墙、`rounded-full` 胶囊标签群
- 低对比灰字 + 细 1px 发丝边（那是默认 SaaS，不是本风格）
- 紫白渐变 / 紫靛赛博默认套路
- 暖奶油衬线 + 陶土橙模板组合
- 报纸细线多栏、emoji 装饰贴纸、Hero 浮层徽章
- 把风格做成“故意难用的真 Brutalism”——本产品要 **可用的 Neubrutalism**

---

## 5. 色板（CSS 变量名固定）

灵感来自 Neubrutalism 经典色：Off-white 底 + 纯黑结构 + 少量高饱和强调。

```css
:root {
  --nb-black: #000000;
  --nb-ink: #111111;
  --nb-paper: #fffdf5;
  --nb-cream: #ffe56b;      /* 主强调：海报黄 */
  --nb-coral: #ff6b6b;      /* 危急 / 最终伤害 */
  --nb-sky: #74b9ff;        /* 次强调：信息块 */
  --nb-mint: #88d498;       /* 正向 / 提升 */
  --nb-muted: #5c5c5c;

  --surface-0: var(--nb-paper);
  --surface-1: #ffffff;
  --surface-accent: var(--nb-cream);
  --surface-danger: var(--nb-coral);
  --surface-info: var(--nb-sky);

  --text-primary: var(--nb-ink);
  --text-muted: var(--nb-muted);
  --text-on-accent: var(--nb-black);

  --border-strong: 3px solid var(--nb-black);
  --shadow-hard: 4px 4px 0 var(--nb-black);
  --shadow-hard-lg: 6px 6px 0 var(--nb-black);
}
```

**使用纪律**

- 页面底：`--nb-paper` 或整块 `--nb-cream` 色带，不要渐变晕染
- 结构线永远用 `--nb-black`，不要换成浅灰边
- `--nb-coral` 留给最终伤害、错误、主 CTA（克制）
- 同一屏强调色不超过 3 种在“大面积”上打架

---

## 6. 字体

| 角色 | 方向 | 推荐 |
|------|------|------|
| 展示 / 品牌 | 超粗、块面感强的无衬线 | `Archivo Black`, `Lexend Mega`, `Syne` |
| 中文标题 | 粗黑 | `Noto Sans SC` 700–900 |
| 正文 | 清晰中性无衬线 | `Public Sans`, `IBM Plex Sans`, `Noto Sans SC` |
| 数据 / 标签 | 等宽或紧缩无衬线 | `Space Mono`, `IBM Plex Mono` |

```css
:root {
  --font-display: "Archivo Black", "Noto Sans SC", sans-serif;
  --font-body: "Public Sans", "Noto Sans SC", sans-serif;
  --font-mono: "Space Mono", "IBM Plex Mono", monospace;
}
```

**排版纪律**

- 品牌字可以“撑满一行”、字距略紧
- 标题短、冲、少修饰
- 正文保持可读行长；不要用展示字体跑长段落
- 数字结果：等宽 + 粗重，可配色块底

---

## 7. 组件配方（抄这段就不会跑偏）

### 面板 / 卡片（本风格允许“盒子”——边框即结构）

```css
.nb-panel {
  background: var(--surface-1);
  border: var(--border-strong);
  box-shadow: var(--shadow-hard);
  border-radius: 0;
  padding: 1.25rem 1.5rem;
}
```

### 按钮

```css
.nb-btn {
  border: var(--border-strong);
  box-shadow: 3px 3px 0 var(--nb-black);
  background: var(--nb-cream);
  color: var(--nb-black);
  font-weight: 700;
  border-radius: 0;
}
.nb-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--nb-black);
}
.nb-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--nb-black);
}
```

### 输入框

```css
.nb-input {
  border: var(--border-strong);
  box-shadow: 3px 3px 0 var(--nb-black);
  background: #fff;
  border-radius: 0;
}
.nb-input:focus {
  outline: none;
  background: var(--nb-cream);
}
```

---

## 8. 布局

- **计算器页**：左输入盒、右结果盒——两个硬边框面板并列
- 结果区可用珊瑚/黄色色块托住最终伤害数字
- 移动端上下堆叠；结果可 sticky
- 不要三列以上等权软卡片栅格

---

## 9. 动效（2～3 个有意图即可）

1. **按钮按压**：阴影收缩 + 位移（见上），像实体按键
2. **数值变更**：结果数字短暂 scale 弹一下（≤200ms）
3. **乘区条入场**：依次从左滑入 / 宽度展开（stagger 40–70ms）

禁用：柔光 pulse、长渐变过渡、毛玻璃模糊动画。  
尊重 `prefers-reduced-motion`。

---

## 10. 文案语气

- 直给、短句、可带一点海报口吻
- 可用：拆解、对照、加算、乘区
- 避免过度萌系或过长敬语
- 错误：`倍率必须大于 0`

---

## 11. 无障碍

- 黄底必须配黑字；不要黄字白底
- 焦点态：加粗边或奶油底，不能只靠颜色
- 触控目标 ≥ 44px
- 色块对比自测（尤其黄/粉大面积时）

---

## 12. PR 检查清单

- [ ] 主要容器都有 **≥3px 黑边 + 硬阴影**
- [ ] **无渐变、无模糊阴影、无大圆角**
- [ ] 品牌字在首屏足够大
- [ ] 强调色 ≤3，且最终伤害是视觉焦点
- [ ] 有按压/数值/乘区入场中至少 2 种动效
- [ ] 桌面与窄屏都能完成一次计算

---

## 13. 文件约定

| 文件 | 用途 |
|------|------|
| `docs/ui-neobrutalism.md` | 本文档 |
| `src/styles/tokens.css` | 变量 |
| `src/styles/global.css` | 全局与组件类 |
| class 前缀 | `nb-` |

**违反本文件 = UI 不合格。**
