# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Pre-commit standard

Before committing anything, always run a restructure/cleanup pass over the
changed code (reuse, simplification, efficiency, and altitude review — e.g.
the /simplify workflow) and apply the fixes. Then typecheck (`npx tsc
--noEmit`) and verify the app still bundles (`npx expo export --platform
android`) before the commit.

# Post-feature standard

After finishing a batch of features, always give the user a fresh list of
10 new recommended features (not yet implemented), roughly ordered by value
per effort, so there is always a concrete roadmap to pick from.

# Versioning standard

The version is a plain decimal below 1.0, and every drop adds to it:

| Drop                                                   | Bump     |
| ------------------------------------------------------ | -------- |
| Bug fixes only                                          | `+0.001` |
| One or two features                                     | `+0.01`  |
| Several features moving the app towards the 1.0 release | `+0.1`   |

Because the increments are literal decimal addition they carry on their own
(`0.819 + 0.001 = 0.820`, `0.99 + 0.01 = 1.00`), so 1.0 arrives exactly when
the app is release-ready — real store billing, and the deferred code-quality
work done.

Every commit that ships app changes bumps the version, in the same commit:

1. `app.json` → `expo.version` (the number itself, e.g. `"0.813"`).
2. `app.json` → `expo.android.versionCode` → the version × 1000 as an
   integer (`0.813` → `813`). Android refuses to install a build whose
   versionCode is not higher than the installed one, and deriving it keeps
   it monotonic without a second thing to remember.
3. `package.json` → `version` → the same number padded to semver, which is
   all npm accepts (`0.813` → `"0.813.0"`).
4. `CHANGELOG.md` → a new entry at the top saying what the drop contained.

Documentation-only or workflow-only commits do not bump anything.
