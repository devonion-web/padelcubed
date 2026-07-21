/**
 * Minimal ambient declaration for `process.env` so the lib builds
 * cleanly under a DOM-only tsconfig. Expo and Node both provide
 * this global at runtime; this file only satisfies the type-checker.
 */
declare const process: {
  env: Record<string, string | undefined>;
};
