# AGENTS.md

## Project

`star_damage_cal` — Honkai: Star Rail direct-damage calculator (P0) with **Neo Brutalism** UI.

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
- Damage math lives in `src/engine/` as pure functions; keep it UI-agnostic and covered by vitest.
- Formula source: Huiji wiki 伤害计算公式 (direct damage zones for P0).

## P0 scope

In: direct damage, crit modes, enemy templates, manual buffs, zone breakdown, marginal gains.  
Out: DOT/break, full character DB, team optimizer (later phases).
