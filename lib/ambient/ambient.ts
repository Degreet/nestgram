import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The ambient per-update context — a framework-owned `AsyncLocalStorage`.
 *
 * The dispatcher runs each update's processing inside {@link runAmbient}, so any
 * code in that async call chain (guards, interceptors, the handler, and any
 * service it calls) can read per-update values WITHOUT them being threaded
 * through arguments or hung off a context object the handler sees. This is the
 * rail sessions ride today, and locale/`t()` (i18n) will ride next: both stay
 * free functions reachable anywhere, never an injected handler parameter.
 *
 * In-process only: it does not cross a worker/queue boundary (e.g. BullMQ), so
 * offloaded work must carry what it needs explicitly.
 */
export type AmbientStore = Map<symbol, unknown>;

const storage = new AsyncLocalStorage<AmbientStore>();

/** Run `fn` with a fresh ambient store; everything it awaits shares the store. */
export function runAmbient<T>(fn: () => T): T {
  return storage.run(new Map(), fn);
}

/** Read a value from the current ambient store (undefined outside a run). */
export function getAmbient<T>(key: symbol): T | undefined {
  return storage.getStore()?.get(key) as T | undefined;
}

/**
 * Write a value into the current ambient store. No-ops outside a run (returns
 * false), so callers can stay agnostic about whether a context is active.
 */
export function setAmbient(key: symbol, value: unknown): boolean {
  const store = storage.getStore();
  if (!store) {
    return false;
  }
  store.set(key, value);
  return true;
}

/** Whether an ambient context is currently active. */
export function hasAmbient(): boolean {
  return storage.getStore() !== undefined;
}
