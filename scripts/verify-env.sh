#!/usr/bin/env bash
# Idempotent environment check for star_damage_cal.
# Safe to run on every cloud-agent boot; exits non-zero if a required tool is missing.
set -euo pipefail

echo "==> star_damage_cal environment verification"
echo

fail=0

check_cmd() {
  local name="$1"
  local version_cmd="${2:-}"
  if command -v "$name" >/dev/null 2>&1; then
    if [[ -n "$version_cmd" ]]; then
      echo "OK  $name: $($version_cmd 2>&1 | head -n 1)"
    else
      echo "OK  $name: $(command -v "$name")"
    fi
  else
    echo "MISSING  $name"
    fail=1
  fi
}

check_cmd node "node -v"
check_cmd npm "npm -v"
check_cmd pnpm "pnpm -v"
check_cmd python3 "python3 --version"
check_cmd pip3 "pip3 --version"
check_cmd git "git --version"
check_cmd curl "curl --version"

echo
echo "==> Project status"
if [[ -f package.json || -f pyproject.toml || -f requirements.txt || -f Cargo.toml || -f go.mod ]]; then
  echo "Application manifests found."
  if [[ -f package.json ]]; then
    echo "Running: npm install"
    npm install
  fi
  if [[ -f requirements.txt ]]; then
    echo "Running: pip3 install -r requirements.txt"
    pip3 install -r requirements.txt
  fi
  if [[ -f pyproject.toml ]] && command -v uv >/dev/null 2>&1; then
    echo "Running: uv sync"
    uv sync
  fi
else
  echo "No application manifests yet (greenfield repo)."
  echo "Add package.json / pyproject.toml / etc., then re-run this script."
fi

echo
if [[ "$fail" -ne 0 ]]; then
  echo "Environment verification FAILED."
  exit 1
fi

echo "Environment verification PASSED."
exit 0
