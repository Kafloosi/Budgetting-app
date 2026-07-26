#!/usr/bin/env bash
# Install every agent tool this project expects, in one pass.
#
# Nothing here carries between environments: a fresh container starts with the
# repo and nothing else, so each new session has to rebuild the tooling. What
# can be committed already is (impeccable's skill lives in .claude/skills and
# .github/skills), and what cannot is installed here.
#
# Safe to re-run: every step is idempotent and skips work already done.
set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Node's built-in fetch ignores HTTPS_PROXY unless told otherwise, and the
# installers below use it. Without this they fail with no proxy-side error.
export NODE_USE_ENV_PROXY=1

step() { printf '\n=== %s ===\n' "$1"; }
ok()   { printf '  ok: %s\n' "$1"; }
skip() { printf '  skip: %s\n' "$1"; }
warn() { printf '  warn: %s\n' "$1" >&2; }

# --- gstack: /browse, /ship, /review, /qa and ~50 more ------------------------
# Cloned, never vendored — a finished install is ~1.6 GB of build output,
# node_modules and a browser.
step "gstack"
if [ -d "$PROJECT_ROOT/.claude/skills/gstack/.git" ]; then
  skip "already cloned (run scripts/setup-gstack.sh to update)"
elif ! command -v bun >/dev/null 2>&1; then
  warn "needs bun (https://bun.sh) — skipping"
else
  ./scripts/setup-gstack.sh && ok "installed" || warn "install failed"
fi

# --- claude-mem: cross-session memory ----------------------------------------
# A user-scoped Claude Code plugin, so it lives in ~/.claude and not the repo.
# Its capture hooks run at SessionStart, which means memory starts recording
# from the NEXT session after the one that installs it.
step "claude-mem"
if [ -d "$HOME/.claude-mem" ]; then
  skip "already installed"
else
  if npx --yes claude-mem install --ide claude-code --provider claude; then
    npx --yes claude-mem telemetry disable >/dev/null 2>&1 || true
    ok "installed (telemetry off)"
  else
    warn "install failed"
  fi
fi
npx --yes claude-mem start >/dev/null 2>&1 && ok "worker running" || warn "worker not started"

# --- impeccable: the /impeccable design skill ---------------------------------
# Committed to the repo, so it works with no install. This only refreshes it
# and re-writes the harness hooks, which are gitignored.
step "impeccable"
if [ -f "$PROJECT_ROOT/.claude/skills/impeccable/SKILL.md" ]; then
  ok "present in the repo"
else
  npx --yes impeccable install && ok "installed" || warn "install failed"
fi

printf '\nTooling setup complete.\n'
