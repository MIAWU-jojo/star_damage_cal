# AGENTS.md

## Project

`star_damage_cal` — Honkai: Star Rail damage calculator, team workshop, rotation & build tools (Neo Brutalism UI).

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## Constraints

- UI must follow `docs/ui-neobrutalism.md` (Neo Brutalism / Neubrutalism).
- Required: thick black borders, hard offset shadows (no blur), flat high-contrast fills, oversized display type.
- Forbidden: gradients, soft shadows, large border-radius, glassy SaaS look.
- Damage / team / rotation math lives in `src/engine/` as pure functions; keep UI-agnostic and covered by vitest.
- Formula source: Huiji wiki 伤害计算公式.
- Track remaining work in `TODO.md` and keep it updated when finishing items.

## Routes

- `#/` — damage calculator
- `#/team` — team workshop (buff aggregate, coverage, swap, combo search, compare)
- `#/rotation` — skill rotation (direct / DOT / break rails + toughness)
- `#/build` — substat advice + Fribbels / relic JSON import
- `#/formula` — formula explain page

## Scope notes

Presets and rails are **simplified approximations**, not full kit parsers. No GPU relic optimizer.
