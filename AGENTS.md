# AGENTS.md

## Project status

`star_damage_cal` is currently a greenfield repository. The only product file on `main` is a placeholder `README.md`. There is no application code, dependency manifest, test suite, or runnable service yet.

## Environment

- Cloud agents use `.cursor/environment.json`.
- On boot, `./scripts/verify-env.sh` confirms the toolchain (Node, npm/pnpm, Python, git, curl).
- When application manifests are added (`package.json`, `requirements.txt`, `pyproject.toml`, etc.), that script will install dependencies automatically.

## Working here

1. Create a feature branch from `main`.
2. Scaffold the app (web UI, CLI, or API) and its dependency manifests.
3. Update `.cursor/environment.json` `install` / `terminals` if the app needs a persistent start command.
4. Keep `scripts/verify-env.sh` idempotent and fast.

## Verification

```bash
./scripts/verify-env.sh
```

Until an app exists, that command is the environment smoke test.
