# star_damage_cal

Greenfield project. No application code has been added yet.

## Development environment

This repo is configured for Cursor Cloud Agents via `.cursor/environment.json`.

### Prerequisites (available in the cloud VM)

| Tool   | Notes                          |
|--------|--------------------------------|
| Node.js | v22+                          |
| npm / pnpm | package managers           |
| Python 3 | 3.12+                        |
| git, curl | standard utilities          |

### Verify the environment

```bash
./scripts/verify-env.sh
```

Expected result: `Environment verification PASSED.`

### Next steps

Add an application scaffold (for example a web damage calculator) with a dependency manifest, then update `.cursor/environment.json` so cloud agents can install dependencies and start the app automatically.
