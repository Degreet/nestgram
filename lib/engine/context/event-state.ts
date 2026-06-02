/**
 * A per-update mutable store. Created when an update is wrapped, shared across
 * the whole pipeline (guards, interceptors, handler, and the event's own
 * actions), and discarded with the update.
 *
 * The general extension point for attaching your own flags/context to an update
 * — e.g. a guard records `state.set('isAdmin', true)` and an interceptor or
 * handler reads it. The framework's own auto-answer uses the same store, nothing
 * privileged. Reach it via `TelegramExecutionContext.of(ctx).state` or `@State()`.
 */
export type EventState = Map<unknown, unknown>;
