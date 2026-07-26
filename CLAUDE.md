@AGENTS.md

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

Install or update it for this project with:

```sh
npx impeccable install   # then `/impeccable init` in the harness
```

Nothing it writes is committed — the skill copies (`.claude/skills/impeccable`,
`.github/skills/impeccable`), the hooks, and `.claude/settings.local.json` are
all gitignored and reinstalled per environment, the same as gstack. A freshly
installed skill is not visible to the session that installed it; it registers
on the next session.

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
