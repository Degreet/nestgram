/**
 * Testing utilities — dispatch fake updates against your real routers and assert
 * on what the bot would send, with no Telegram connection.
 *
 * Jest-agnostic: nothing here imports a test framework; the harness returns plain
 * data you assert on with your own runner. Import from `nestgram` (the main
 * barrel) or, where the package's subpath exports allow it, `nestgram/testing`.
 */
export * from './nestgram-testbed';
export * from './update-factory';
export * from './api-capture.store';
export * from './capture.interceptor';
export * from './testing.types';
