import appConfig from '../app.json';

/**
 * app.json is the single source of truth for the version, so the number the
 * user sees in Settings is always the one baked into the installed build.
 *
 * The ladder is documented in AGENTS.md: the version is a plain decimal that
 * bug fixes (+0.0001), one- or two-feature drops (+0.001), and batches moving
 * towards release (+0.01) add to, so it reaches 1.0 exactly when the app is
 * release-ready.
 */
export const APP_VERSION = appConfig.expo.version;
