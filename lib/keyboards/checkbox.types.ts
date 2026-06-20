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
  /**
   * Pre-selected ids that seed the session-backed default before the first tap.
   * Once a selection has been persisted it wins — an empty selection is a real
   * state, not "seed me again". Applies only to the session-backed store: a
   * custom `onChange`/`onToggle` store seeds its own initial state, and an
   * explicit `selected` reader owns the read entirely (both ignore `default`).
   * For a radio group only the first id seeds.
   */
  default?: Iterable<string | number>;
  /** WRITE the new full set, once. Mutually exclusive with `onToggle`. */
  onChange?: (ids: string[]) => void;
  /** WRITE a per-item delta (`id` is now `on`), once per changed item. */
  onToggle?: (id: string, on: boolean) => void;
  /**
   * Partition this group's selection by a dependency, so a linked group keeps a
   * separate selection per value of what it depends on. The flagship: tags scoped
   * by the chosen category — `scope: () => selectedIds('category')[0]` — so each
   * category remembers its own tag picks and switching never mixes them. The state
   * key becomes `checkbox:<id>:<scope>`; `undefined` or `''` means the unscoped key. Read
   * fresh on every render/tap, so keep it cheap and pure (a rail read, no I/O).
   * Session-backed only — a custom store keys its own writes.
   */
  scope?: () => string | number | undefined;
}

/** Composes the checkbox buttons with the full keyboard sugar (`cb.toggle`/`.map`/`.split`/…). */
export type CheckboxBuilder = (cb: CheckboxScope) => void;
