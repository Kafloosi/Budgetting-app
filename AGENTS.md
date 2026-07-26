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

| Drop                                                   | Bump      |
| ------------------------------------------------------ | --------- |
| Bug fixes only                                          | `+0.0001` |
| One or two features                                     | `+0.001`  |
| Several features moving the app towards the 1.0 release | `+0.01`   |

Because the increments are literal decimal addition they carry on their own
(`0.8239 + 0.0001 = 0.8240`, `0.99 + 0.01 = 1.00`), so 1.0 arrives exactly
when the app is release-ready — real store billing, and the deferred
code-quality work done. The full release is `1.0` and nothing finer.

Every commit that ships app changes bumps the version, in the same commit:

1. `app.json` → `expo.version` (the number itself, e.g. `"0.823"`).
2. `app.json` → `expo.android.versionCode` → the version × 10000 as an
   integer (`0.823` → `8230`, `0.8231` → `8231`). Android refuses to install
   a build whose versionCode is not higher than the installed one, and
   deriving it keeps it monotonic without a second thing to remember.
3. `package.json` → `version` → semver, with the fourth decimal as the patch
   number, which is all npm accepts (`0.823` → `"0.823.0"`, `0.8231` →
   `"0.823.1"`).
4. `CHANGELOG.md` → a new entry at the top saying what the drop contained.
5. `src/changelog.ts` → a matching `RELEASE_NOTES` entry in the user's words.
   The app shows these on first launch after an update, so a drop without an
   entry ships silently.

Documentation-only or workflow-only commits do not bump anything.
