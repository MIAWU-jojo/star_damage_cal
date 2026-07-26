# AGENTS.md

## Project

`star_damage_cal` — Honkai: Star Rail direct-damage calculator + team workshop (Neo Brutalism UI).

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
- Damage / team math lives in `src/engine/` as pure functions; keep UI-agnostic and covered by vitest.
- Formula source: Huiji wiki 伤害计算公式.
- Track remaining work in `TODO.md` and keep it updated when finishing items.

## Routes

- `#/` — damage calculator
- `#/team` — team workshop (buff aggregate, coverage, single-swap optimize)
- `#/formula` — formula explain page

## Scope notes

Support / character presets are **simplified approximations** for workshop math, not full kit parsers.
