import type { CheckboxScope } from './inline-keyboard';

/**
 * The cross-cutting behaviour of a checkbox group — everything that isn't layout
 * (layout is the builder's job). No `ctx`: the read/write callbacks reach request
 * state through the ambient rail (`session()`), since the built-in checkbox
 * router runs inside the request `AsyncLocalStorage`.
 */
export interface CheckboxConfig {
  /** Checkboxes (many, default) or radio (exactly one). */
  multi?: boolean;
  /**
   * READ the currently-selected ids. Omit for the session-backed default. Called
   * on every render (and once per tap) — keep it cheap and pure, no I/O.
   */
  selected?: () => Iterable<string | number>;
  /** WRITE the new full set, once. Mutually exclusive with `onToggle`. */
  onChange?: (ids: string[]) => void;
  /** WRITE a per-item delta (`id` is now `on`), once per changed item. */
  onToggle?: (id: string, on: boolean) => void;
}

/** Composes the checkbox buttons with the full keyboard sugar (`cb.toggle`/`.map`/`.split`/…). */
export type CheckboxBuilder = (cb: CheckboxScope) => void;
