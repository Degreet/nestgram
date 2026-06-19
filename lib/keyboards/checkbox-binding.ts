import { Logger } from '@nestjs/common';

import { getAmbient } from '../ambient';
import { SESSION } from '../sessions/session.constants';
import { CHECKBOX_SESSION_PREFIX } from './checkbox.constants';
import type { CheckboxConfig } from './checkbox.types';

/**
 * The state half of a checkbox group: reads the current selection and applies a
 * tap (toggle when multi, replace when radio), persisting through the config's
 * `onChange`/`onToggle` — or the session default under `checkbox:<id>` when
 * neither is given. Separated from the keyboard's rendering so each has one job.
 *
 * No `ctx`: selection lives on the ambient rail, read fresh on every call (the
 * built-in router runs inside the request `AsyncLocalStorage`), so re-rendering
 * always reflects the latest state.
 */
export class CheckboxBinding {
  private readonly logger = new Logger(CheckboxBinding.name);

  constructor(
    private readonly id: string,
    private readonly config: CheckboxConfig,
  ) {}

  /** Whether this group is multi-select (default) rather than single-select (radio). */
  get multi(): boolean {
    return this.config.multi !== false;
  }

  /** The currently-selected ids, normalized to strings. */
  selected(): Set<string> {
    const raw = this.config.selected
      ? this.config.selected()
      : this.sessionGet();
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
      this.sessionSet([...next]);
    }
  }

  private get sessionField(): string {
    return `${CHECKBOX_SESSION_PREFIX}${this.id}`;
  }

  private sessionStore(): Record<string, unknown> | undefined {
    const session = getAmbient<Record<string, unknown>>(SESSION);
    if (!session) {
      this.logger.warn(
        `Checkbox "${this.id}" has no selected/onChange and no active session — ` +
          'the selection cannot persist. Import SessionModule, or pass ' +
          'selected/onChange.',
      );
    }
    return session;
  }

  private sessionGet(): string[] {
    const value = this.sessionStore()?.[this.sessionField];
    return Array.isArray(value) ? value.map(String) : [];
  }

  private sessionSet(ids: string[]): void {
    const store = this.sessionStore();
    if (store) {
      store[this.sessionField] = ids;
    }
  }
}
