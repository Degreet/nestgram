import { Logger } from '@nestjs/common';

import { getAmbient } from '../ambient';
import { NestgramConfigError } from '../exceptions/config.exception';
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
          'session-backed default.',
      );
    }
  }

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

  // The prefix is also a safety boundary: a group id reaches this from user-facing
  // code, and prefixing keeps a hostile id like `__proto__` out of a bare session
  // key (`checkbox:__proto__`, never `__proto__`). Don't drop it in a refactor.
  private get sessionField(): string {
    return `${CHECKBOX_SESSION_PREFIX}${this.id}`;
  }

  // Reading the selection (every render) is silent — no session simply means an
  // empty selection. The warning belongs on the write path: a tap that can't
  // persist is the real problem.
  private sessionGet(): string[] {
    const session = getAmbient<Record<string, unknown>>(SESSION);
    const value = session?.[this.sessionField];
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return this.seed(); // nothing persisted yet → the configured default
  }

  /**
   * The pre-tap selection from `default`, normalized. A radio group seeds at most
   * one id, never two ticks. Only ever reached on the session-backed path — a
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

  private sessionSet(ids: string[]): void {
    const session = getAmbient<Record<string, unknown>>(SESSION);
    if (!session) {
      this.logger.warn(
        `Checkbox "${this.id}" has no selected/onChange and no active session — ` +
          'the tap cannot persist. Import SessionModule, or pass selected/onChange.',
      );
      return;
    }
    session[this.sessionField] = ids;
  }
}
