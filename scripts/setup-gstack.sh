#!/usr/bin/env bash
# Install or update gstack for this project.
#
# gstack is cloned rather than vendored: a finished install is ~1.6 GB of
# build output, node_modules and a browser, so .claude/skills/gstack is
# gitignored and rebuilt locally by this script instead.
#
# Safe to re-run — it updates an existing clone in place.
set -euo pipefail

REPO="https://github.com/garrytan/gstack.git"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GSTACK_DIR="$PROJECT_ROOT/.claude/skills/gstack"

if ! command -v bun >/dev/null 2>&1; then
  echo "gstack needs bun. Install it from https://bun.sh, then re-run this script." >&2
  exit 1
fi

if [ -d "$GSTACK_DIR/.git" ]; then
  echo "Updating gstack in $GSTACK_DIR"
  git -C "$GSTACK_DIR" pull --ff-only
else
  echo "Cloning gstack into $GSTACK_DIR"
  mkdir -p "$(dirname "$GSTACK_DIR")"
  git clone --single-branch --depth 1 "$REPO" "$GSTACK_DIR"
fi

# setup registers every skill into the parent directory (.claude/skills),
# which is what makes them project-scoped rather than user-scoped.
cd "$GSTACK_DIR"
./setup
