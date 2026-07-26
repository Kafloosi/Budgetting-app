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
