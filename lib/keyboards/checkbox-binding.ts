import { Logger } from '@nestjs/common';

import { getAmbient } from '../ambient';
import { NestgramConfigError } from '../exceptions/config.exception';
import { CHECKBOX_STATE_PREFIX } from './checkbox.constants';
import { KEYBOARD_STATE } from './state/keyboard-state.constants';
import type { CheckboxConfig } from './checkbox.types';

/**
 * The state half of a checkbox group: reads the current selection and applies a
 * tap (toggle when multi, replace when radio), persisting through the config's
 * `onChange`/`onToggle` — or the per-message keyboard state under `checkbox:<id>`
 * when neither is given. Separated from rendering so each has one job.
 *
 * No `ctx`: selection lives on the ambient rail, read fresh on every call (the
 * built-in router runs inside the request `AsyncLocalStorage`), so re-rendering
 * always reflects the latest state. The keyboard-state stage loads that rail per
 * tap and persists it after — the default store needs no import.
 */
export class CheckboxBinding {
  private readonly logger = new Logger(CheckboxBinding.name);

  constructor(
    private readonly id: string,
    private readonly config: CheckboxConfig,
  ) {
    if (config.onChange && config.onToggle) {
      throw new NestgramConfigError(
        `Checkbox "${id}": onChange and onToggle are mutually exclusive — ` +
          'pick the whole-set writer or the per-item one, not both.',
      );
    }
    if ((config.onChange || config.onToggle) && !config.selected) {
      throw new NestgramConfigError(
        `Checkbox "${id}": a custom store (onChange/onToggle) needs a matching ` +
          'selected reader — the binding has nowhere to read the current set from ' +
          'otherwise, so toggling breaks. Add selected, or drop both for the ' +
          'default per-message keyboard state.',
      );
    }
    if (
      config.scope &&
      (config.selected || config.onChange || config.onToggle)
    ) {
      throw new NestgramConfigError(
        `Checkbox "${id}": scope partitions the per-message keyboard-state key, so ` +
          'it has no effect with a custom selected/onChange/onToggle store (which ' +
          'owns its own keys). Drop scope, or partition inside your store.',
      );
    }
  }

  /** Whether this group is multi-select (default) rather than single-select (radio). */
  get multi(): boolean {
    return this.config.multi !== false;
  }

  /** The currently-selected ids, normalized to strings. */
  selected(): Set<string> {
    const raw = this.config.selected ? this.config.selected() : this.stateGet();
    return new Set([...raw].map(String));
  }

  /** Apply a tap on `item` — toggle (multi) or replace (radio) — then persist. */
  applyToggle(item: string): void {
    const current = this.selected();
    const next = new Set(current);
    if (this.multi) {
      if (current.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
    } else {
      next.clear();
      // Re-tapping the selected radio option clears it; tapping another selects it.
      if (!current.has(item)) {
        next.add(item);
      }
    }
    this.write(current, next);
  }

  /** Clear the whole selection — through the same write path as a tap (scope/
   * onChange/onToggle all honoured: off-deltas, `[]`, or `[]` under the scoped key). */
  clearAll(): void {
    this.write(this.selected(), new Set());
  }

  /** Replace the selection with `next` (a radio group keeps at most one). Same write path. */
  replace(next: Iterable<string>): void {
    const norm = [...next].map(String);
    this.write(this.selected(), new Set(this.multi ? norm : norm.slice(0, 1)));
  }

  private write(prev: Set<string>, next: Set<string>): void {
    if (this.config.onToggle) {
      for (const id of next) {
        if (!prev.has(id)) this.config.onToggle(id, true);
      }
      for (const id of prev) {
        if (!next.has(id)) this.config.onToggle(id, false);
      }
    } else if (this.config.onChange) {
      this.config.onChange([...next]);
    } else {
      this.stateSet([...next]);
    }
  }

  // The prefix is also a safety boundary: a group id reaches this from user-facing
  // code, and prefixing keeps a hostile id like `__proto__` out of a bare state
  // key (`checkbox:__proto__`, never `__proto__`). Don't drop it in a refactor.
  // A `scope` partitions the selection per dependency (`checkbox:tags:<category>`),
  // so a linked group keeps a separate set per value it depends on.
  private get stateField(): string {
    const base = `${CHECKBOX_STATE_PREFIX}${this.id}`;
    const scope = this.config.scope?.();
    return scope === undefined || scope === '' ? base : `${base}:${scope}`;
  }

  // Reading the selection (every render) is silent — no state simply means an
  // empty selection (the initial render, before any tap, seeds from `default`).
  // The warning belongs on the write path: a tap that can't persist is the real
  // problem.
  private stateGet(): string[] {
    const state = getAmbient<Record<string, unknown>>(KEYBOARD_STATE);
    const value = state?.[this.stateField];
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return this.seed(); // nothing persisted yet → the configured default
  }

  /**
   * The pre-tap selection from `default`, normalized. A radio group seeds at most
   * one id, never two ticks. Only ever reached on the keyboard-state path — a
   * custom store carries its own `selected` reader (enforced in the constructor),
   * so `default` never applies there and can't diverge from it.
   */
  private seed(): string[] {
    if (!this.config.default) {
      return [];
    }
    const ids = [...this.config.default].map(String);
    return this.multi ? ids : ids.slice(0, 1);
  }

  private stateSet(ids: string[]): void {
    const state = getAmbient<Record<string, unknown>>(KEYBOARD_STATE);
    if (!state) {
      // The keyboard-state stage loads the rail on every callback, so this only
      // fires off the dispatch path (a tap applied with no ambient context).
      this.logger.warn(
        `Checkbox "${this.id}" tapped with no active keyboard state — the change ` +
          'cannot persist. This should not happen inside the dispatch pipeline.',
      );
      return;
    }
    state[this.stateField] = ids;
  }
}
