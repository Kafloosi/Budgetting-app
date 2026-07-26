import appConfig from '../app.json';

/**
 * app.json is the single source of truth for the version, so the number the
 * user sees in Settings is always the one baked into the installed build.
 *
 * The ladder is documented in AGENTS.md: the version is a plain decimal that
 * bug fixes (+0.001), small drops (+0.01), and milestone batches (+0.1) add
 * to, so it reaches 1.0 exactly when the app is release-ready.
 */
export const APP_VERSION = appConfig.expo.version;
