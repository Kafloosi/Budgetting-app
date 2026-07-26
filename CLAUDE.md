@AGENTS.md

# Agent tooling

Nothing installed carries between environments — a fresh session gets the repo
and nothing else. One command rebuilds everything:

```sh
./scripts/setup-tooling.sh
```

It is idempotent and runs automatically in the background on session start (see
the `SessionStart` hook in `.claude/settings.json`), so a new session usually
has nothing to do. The log is at `.claude/setup-tooling.log`.

| Tool | Committed? | Available |
| ---- | ---------- | --------- |
| impeccable | yes, `.claude/skills/impeccable` | immediately, no install |
| gstack | no — a built install is ~1.6 GB | after the clone finishes (~2 min) |
| claude-mem | no — a user-scoped plugin in `~/.claude` | records from the *next* session |

claude-mem's capture hooks run at `SessionStart`, so the session that installs
it is never the session it records. That is expected, not a fault.

# gstack

[gstack](https://github.com/garrytan/gstack) provides the skills below.

Install or update it for this project with:

```sh
./scripts/setup-gstack.sh
```

It needs [bun](https://bun.sh). The clone lands in `.claude/skills/gstack`
and is gitignored — a built install is ~1.6 GB, so it is rebuilt locally
rather than committed. `/gstack-upgrade` also updates an existing install.

# impeccable

[impeccable](https://impeccable.style) provides the `/impeccable` design skill.

The skill is committed at `.claude/skills/impeccable`, so `/impeccable` works in
a fresh clone with nothing to install. Its detector hooks live in the tracked
`.claude/settings.json` rather than `settings.local.json`, so they are shared
too.

Update it, or add the GitHub Copilot copy, with:

```sh
npx impeccable install   # then `/impeccable init` in the harness
```

That regenerates `.github/skills/impeccable` and `.github/hooks/`, which stay
gitignored as a byte-identical duplicate of the committed Claude Code copy.

## Web browsing

Use the **`/browse`** skill from gstack for **all** web browsing.

**Never use the `mcp__claude-in-chrome__*` tools.**

## Available skills

| Skill | Skill | Skill |
| ----- | ----- | ----- |
| `/office-hours` | `/plan-ceo-review` | `/plan-eng-review` |
| `/plan-design-review` | `/plan-devex-review` | `/design-consultation` |
| `/design-shotgun` | `/design-html` | `/design-review` |
| `/devex-review` | `/review` | `/ship` |
| `/land-and-deploy` | `/canary` | `/benchmark` |
| `/browse` | `/connect-chrome` | `/setup-browser-cookies` |
| `/qa` | `/qa-only` | `/investigate` |
| `/retro` | `/document-release` | `/document-generate` |
| `/codex` | `/cso` | `/autoplan` |
| `/careful` | `/freeze` | `/guard` |
| `/unfreeze` | `/setup-deploy` | `/setup-gbrain` |
| `/gstack-upgrade` | `/learn` | |
