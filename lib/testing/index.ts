/**
 * Testing utilities — dispatch fake updates against your real routers and assert
 * on what the bot would send, with no Telegram connection.
 *
 * Jest-agnostic: nothing here imports a test framework; the harness returns plain
 * data you assert on with your own runner. Import from `nestgram/testing` (kept
 * out of the runtime bundle) or from the main `nestgram` barrel.
 */
export * from './nestgram-testbed';
export * from './update-factory';
export * from './api-capture.store';
export * from './capture.interceptor';
export * from './capture-error.filter';
export * from './testing.types';
