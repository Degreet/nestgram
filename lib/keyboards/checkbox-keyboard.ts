import { Logger } from '@nestjs/common';

import { getAmbient } from '../ambient';
import { SESSION } from '../sessions/session.constants';
import { CallbackRoutePattern } from '../callback-data';
import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';
import {
  CHECKBOX_DEFAULT_MARKERS,
  CHECKBOX_PARAMS,
  CHECKBOX_RADIO_MARKERS,
  CHECKBOX_SESSION_PREFIX,
  CHECKBOX_TOGGLE_ROUTE,
} from './checkbox.constants';

/** A reusable checkbox/radio picker definition. Items are `T`; ids are strings. */
export interface CheckboxConfig<T> {
  /** Stable, unique per checkbox TYPE — the route namespace and registry key. */
  id: string;
  /** The list to render: an array, or a thunk for dynamic lists. */
  items: readonly T[] | (() => readonly T[]);
  /** Checkboxes (many, default) or radio (exactly one). */
  multi?: boolean;
  /** READ: the ids selected right now. Omit for the session-backed default. */
  selected?: () => Iterable<string | number>;
  /** WRITE: persist the new full set, once. Mutually exclusive with `onToggle`. */
  onChange?: (ids: string[]) => void;
  /** WRITE: a per-item delta (`id` is now `on`), once per changed item. */
  onToggle?: (id: string, on: boolean) => void;
}

/**
 * A reusable multi/single-select picker. Configured once (not subclassed), it
 * renders an inline keyboard of ✅ (or 🔘/⚪) buttons routed into the
 * `checkbox/<id>/…` namespace; the built-in checkbox router turns a tap into a
 * selection change and re-renders the message in place. The framework owns the
 * markers, layout, toggle/radio math, routing, and re-render — the developer
 * supplies only where the selection lives.
 *
 * The selection is read with `selected()` and written with `onChange(ids)` (the
 * whole set) or `onToggle(id, on)` (a per-item delta); omit both and it persists
 * in the ambient session under `checkbox:<id>`. None of these take a context
 * object — they reach request state through the ambient rail, like `session()`.
 *
 * Declare it once (module scope / a provider) so it registers at boot and
 * survives restarts; the same instance renders the initial message and every
 * re-render.
 *
 * ```ts
 * const tags = new CheckboxKeyboard({ id: 'tags', items: TAGS })
 *   .label((t) => t.name)
 *   .row(Button.text('✓ Save', 'tags/save'));
 * ```
 */
export class CheckboxKeyboard<T = unknown> {
  private static readonly registry = new Map<string, CheckboxKeyboard>();

  private readonly logger = new Logger(CheckboxKeyboard.name);

  private keyOf: (item: T, index: number) => string | number = (_, index) =>
    index;
  private labelOf?: (item: T, on: boolean) => string;
  private onMarker: string;
  private offMarker: string;
  private cols = 1;
  private readonly extraRows: Button[][] = [];

  constructor(private readonly config: CheckboxConfig<T>) {
    const markers =
      config.multi === false
        ? CHECKBOX_RADIO_MARKERS
        : CHECKBOX_DEFAULT_MARKERS;
    this.onMarker = markers.on;
    this.offMarker = markers.off;
    if (CheckboxKeyboard.registry.has(config.id)) {
      this.logger.warn(
        `A CheckboxKeyboard with id "${config.id}" is already registered — the ` +
          "newer one wins and the older one's buttons will route to it. Give " +
          'each checkbox type a unique id.',
      );
    }
    CheckboxKeyboard.registry.set(
      config.id,
      this as unknown as CheckboxKeyboard,
    );
  }

  /** Resolve a registered checkbox by id — used by the built-in checkbox router. */
  static resolve(id: string): CheckboxKeyboard | undefined {
    return CheckboxKeyboard.registry.get(id);
  }

  /** How each item maps to its callback id (default: list index). 64-byte budget. */
  key(of: (item: T, index: number) => string | number): this {
    this.keyOf = of;
    return this;
  }

  /** The button text for an item (the framework prepends the marker). */
  label(of: (item: T, on: boolean) => string): this {
    this.labelOf = of;
    return this;
  }

  /** Override the checked/unchecked glyphs (`markers('', '')` to drop them). */
  markers(on: string, off: string): this {
    this.onMarker = on;
    this.offMarker = off;
    return this;
  }

  /** Items per row (default 1). */
  columns(count: number): this {
    this.cols = count;
    return this;
  }

  /** Append a row of your own buttons below the items (e.g. a Save button). */
  row(...buttons: Button[]): this {
    this.extraRows.push(buttons);
    return this;
  }

  /** The inline keyboard for the current selection — re-read on every call. */
  render(): InlineKeyboard {
    const selected = this.readSelected();
    const keyboard = new InlineKeyboard().map(
      this.resolveItems(),
      (item, i) => {
        const key = String(this.keyOf(item, i));
        return Button.from({
          text: this.buttonLabel(item, selected.has(key)),
          callback_data: CallbackRoutePattern.build(CHECKBOX_TOGGLE_ROUTE, {
            [CHECKBOX_PARAMS.cb]: this.config.id,
            [CHECKBOX_PARAMS.item]: key,
          }),
        });
      },
    );
    keyboard.split(this.cols);
    for (const buttons of this.extraRows) {
      keyboard.row(...buttons);
    }
    return keyboard;
  }

  /** Apply a tap on `itemKey` to the selection (toggle if multi, replace if single). */
  applyToggle(itemKey: string): void {
    const current = this.readSelected();
    const next = new Set(current);
    if (this.multi) {
      if (current.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
    } else {
      next.clear();
      // Re-tapping the selected radio option clears it; tapping another selects it.
      if (!current.has(itemKey)) {
        next.add(itemKey);
      }
    }
    this.writeSelection(current, next);
  }

  private get multi(): boolean {
    return this.config.multi !== false;
  }

  private resolveItems(): readonly T[] {
    const { items } = this.config;
    return typeof items === 'function' ? items() : items;
  }

  private buttonLabel(item: T, on: boolean): string {
    const text = this.labelOf ? this.labelOf(item, on) : String(item);
    const marker = on ? this.onMarker : this.offMarker;
    return marker ? `${marker} ${text}` : text;
  }

  private readSelected(): Set<string> {
    const raw = this.config.selected
      ? this.config.selected()
      : this.sessionGet();
    return new Set([...raw].map(String));
  }

  private writeSelection(prev: Set<string>, next: Set<string>): void {
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
    return `${CHECKBOX_SESSION_PREFIX}${this.config.id}`;
  }

  private sessionStore(): Record<string, unknown> | undefined {
    const session = getAmbient<Record<string, unknown>>(SESSION);
    if (!session) {
      this.logger.warn(
        `CheckboxKeyboard "${this.config.id}" has no selected/onChange and no ` +
          'active session — the selection cannot persist. Import SessionModule, ' +
          'or pass selected/onChange.',
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
