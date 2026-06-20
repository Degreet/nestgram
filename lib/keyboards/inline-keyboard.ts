import { Logger } from '@nestjs/common';

import type {
  RawInlineKeyboardButton,
  RawInlineKeyboardMarkup,
} from '../events/raw-update.types';
import { CallbackRoutePattern } from '../callback-data';
import { NestgramConfigError } from '../exceptions/config.exception';
import { Button } from './button';
import { CheckboxBinding } from './checkbox-binding';
import {
  CHECKBOX_DEFAULT_MARKERS,
  CHECKBOX_DONE_ROUTE,
  CHECKBOX_PARAMS,
  CHECKBOX_RADIO_MARKERS,
  CHECKBOX_TOGGLE_ROUTE,
} from './checkbox.constants';
import type { CheckboxBuilder, CheckboxConfig } from './checkbox.types';
import { KeyboardBuilder } from './keyboard-builder';
import { NOOP_CALLBACK_DATA } from './noop.constants';
import { RouteParamValues } from './route-params.types';

/** A keyboard's lazily-rendered checkbox section — re-run on every `toJSON()`. */
interface CheckboxSection {
  readonly id: string;
  readonly build: CheckboxBuilder;
  readonly binding: CheckboxBinding;
  /** Index among the eager rows where the rendered section is spliced in. */
  readonly at: number;
}

/**
 * How an edit addresses a button: a **route** (`'toggle/3'` for one, `'toggle/:id'`
 * for all that fit) or a predicate over the `Button`. Position addressing uses
 * `.updateAt()`/`.removeAt()` instead.
 */
type ButtonMatcher = string | ((button: Button) => boolean);

/** Options for {@link InlineKeyboard.paginate}. */
export interface PaginateOptions {
  /** Max buttons shown per page (rows are kept whole, never split across pages). */
  size: number;
  /** The page to render, 0-based (default 0). */
  page?: number;
  /** Label for the previous-page control (default `‹`). */
  prev?: string;
  /** Label for the next-page control (default `›`). */
  next?: string;
}

/**
 * Fluent builder for an inline keyboard (buttons attached under a message).
 *
 * A button is a value ({@link Button}); the keyboard accumulates buttons and a
 * layout method arranges them:
 *
 * - **fluent shortcuts** for the everyday kinds — `.text()`, `.url()`,
 *   `.webApp()`, `.switchInline()`, …;
 * - **`.add(...buttons)`** takes `Button` values directly — the universal inlet,
 *   so every Bot API kind is reachable (`.add(Button.pay('Pay'))`);
 * - **`.map(items, fn)`** turns a collection into buttons.
 *
 * `.split(n)` lays the accumulated buttons into rows of `n`, `.spread()` is one
 * per row, `.row(...buttons)` commits a single row, and `.if(cond)` keeps the
 * last button/row/section. Pass the instance as `reply_markup` — `JSON.stringify`
 * calls `toJSON()`.
 *
 * ```ts
 * new InlineKeyboard()
 *   .map(products, (p) => Button.text(p.name, 'buy/:id', { id: p.id }))
 *   .split(2)
 *   .row(Button.url('Catalog', site));
 * ```
 */
export class InlineKeyboard extends KeyboardBuilder<RawInlineKeyboardButton> {
  /** Default `paginate()` navigation labels, overridable per call. */
  private static readonly PAGINATE_LABELS = { prev: '‹', next: '›' } as const;

  /** Checkbox groups by id, so the built-in router can re-render one on a tap. */
  private static readonly checkboxRegistry = new Map<string, InlineKeyboard>();
  private static readonly logger = new Logger(InlineKeyboard.name);

  private checkboxSection?: CheckboxSection;

  /**
   * A callback button. Two forms, one mechanism — a safe default and a terse
   * shortcut, like `SendMessage` vs `message.answer`:
   *
   * - the framework assembles the route, checking and escaping the parameters —
   *   `.text('Done', 'reminder/done/:id', { id })` (the template-literal types
   *   require every `:param`);
   * - or you interpolate it yourself — `` .text('Done', `reminder/done/${id}`) ``
   *   — terse, no parameter check, no escaping (fine for the numeric-id case).
   *
   * Pressing the button sends the resulting `callback_data` back; route it with
   * `@Action('reminder/done/:id')` + `@Param('id')`. Hide it with a trailing
   * `.if(cond)`.
   */
  text<T extends string>(
    label: string,
    route: T,
    ...[params]: RouteParamValues<T>
  ): this {
    const callbackData = params
      ? CallbackRoutePattern.build(route, params)
      : route;
    this.pushButton({ text: label, callback_data: callbackData });
    return this;
  }

  /** A URL button: pressing it opens the link. */
  url(label: string, url: string): this {
    this.pushButton(Button.url(label, url).toJSON());
    return this;
  }

  /** A Web App button: pressing it opens the Mini App at `url`. */
  webApp(label: string, url: string): this {
    this.pushButton(Button.webApp(label, url).toJSON());
    return this;
  }

  /** Switch to inline mode in another chat, pre-filling `query`. */
  switchInline(label: string, query = ''): this {
    this.pushButton(Button.switchInline(label, query).toJSON());
    return this;
  }

  /** Switch to inline mode in the current chat, pre-filling `query`. */
  switchInlineCurrent(label: string, query = ''): this {
    this.pushButton(Button.switchInlineCurrent(label, query).toJSON());
    return this;
  }

  /** Copy `text` to the clipboard when pressed. */
  copyText(label: string, text: string): this {
    this.pushButton(Button.copyText(label, text).toJSON());
    return this;
  }

  /**
   * Add `Button` values into the current row. The universal inlet — every Bot API
   * button kind is reachable as a `Button`, including the special ones
   * (`.add(Button.pay('Pay'))`). A button hidden by `.if(false)` is dropped (or
   * replaced by its `.else(...)`).
   */
  add(...buttons: Button[]): this {
    this.pushButtons(InlineKeyboard.resolve(buttons));
    return this;
  }

  /**
   * Turn a collection into buttons. `fn` returns a `Button` for each item (or a
   * falsy value to drop it); a `Button.if(false)` is dropped too, so conditional
   * buttons read in one line.
   *
   * ```ts
   * .map(items, (i) => Button.text(i.label, 'pick/:id', { id: i.id }).if(i.ok)).split(2)
   * ```
   */
  map<T>(
    items: readonly T[],
    fn: (item: T, index: number) => Button | null | undefined | false,
  ): this {
    const buttons = items
      .map((item, index) => fn(item, index))
      .filter((button): button is Button => Boolean(button));
    this.pushButtons(InlineKeyboard.resolve(buttons));
    return this;
  }

  /** Commit the accumulated buttons (plus any given here) as a single row. */
  row(...buttons: Button[]): this {
    if (buttons.length > 0) {
      this.add(...buttons);
    }
    return super.row();
  }

  /**
   * Paginate the rows built so far: keep only the current page and append a
   * `‹ page/total ›` navigation row whose arrows route to `route` with the
   * target page number. `route` is a template with exactly one `:param` for the
   * page (`'shop/page/:n'`), filled by the framework; handle it with
   * `@Action('shop/page/:n')` + `@Param('n')` returning the keyboard at that page.
   *
   * Rows are kept whole — `size` is a max button budget per page, not a hard
   * cut — so a `.split(2)` grid paginates by pairs. A single page (everything
   * fits) renders no controls. Append your own rows (a Back/Done button) AFTER
   * this call to keep them off the paged region.
   *
   * ```ts
   * .map(items, (i) => Button.text(i.name, 'open/:id', { id: i.id }))
   *   .split(2)
   *   .paginate('list/page/:n', { size: 8 });
   * ```
   */
  paginate(route: string, options: PaginateOptions): this {
    if (!Number.isInteger(options.size) || options.size < 1) {
      throw new NestgramConfigError(
        'paginate(route) requires a positive integer size',
      );
    }
    const pattern = CallbackRoutePattern.compile(route);
    const [pageParam, ...extra] = pattern.paramNames;
    if (pageParam === undefined || extra.length > 0) {
      throw new NestgramConfigError(
        `paginate(route) needs a route with exactly one :param for the page (got "${route}")`,
      );
    }

    if (this.pending.length > 0) {
      this.spread(); // commit any not-yet-laid-out buttons, one per row
    }
    const pages = this.pageRows(options.size);
    if (pages.length <= 1) {
      return this; // everything fits — no controls
    }

    const current = Math.min(Math.max(options.page ?? 0, 0), pages.length - 1);
    const prev = options.prev ?? InlineKeyboard.PAGINATE_LABELS.prev;
    const next = options.next ?? InlineKeyboard.PAGINATE_LABELS.next;
    this.rows.length = 0;
    this.rows.push(...pages[current]);
    this.rows.push(
      this.navRow(pattern, pageParam, current, pages.length, prev, next),
    );
    return this;
  }

  /** Group the committed rows into pages of at most `size` buttons, keeping rows whole. */
  private pageRows(size: number): RawInlineKeyboardButton[][][] {
    const pages: RawInlineKeyboardButton[][][] = [];
    let page: RawInlineKeyboardButton[][] = [];
    let count = 0;
    for (const row of this.rows) {
      if (count + row.length > size && page.length > 0) {
        pages.push(page);
        page = [];
        count = 0;
      }
      page.push(row);
      count += row.length;
    }
    if (page.length > 0) {
      pages.push(page);
    }
    return pages;
  }

  private navRow(
    pattern: CallbackRoutePattern,
    pageParam: string,
    current: number,
    total: number,
    prev: string,
    next: string,
  ): RawInlineKeyboardButton[] {
    const link = (page: number, text: string): RawInlineKeyboardButton => ({
      text,
      callback_data: pattern.build({ [pageParam]: page }),
    });
    const nav: RawInlineKeyboardButton[] = [];
    if (current > 0) {
      nav.push(link(current - 1, prev));
    }
    nav.push({
      text: `${current + 1}/${total}`,
      callback_data: NOOP_CALLBACK_DATA,
    });
    if (current < total - 1) {
      nav.push(link(current + 1, next));
    }
    return nav;
  }

  /**
   * A checkbox / radio group, built with the full keyboard sugar inside `build`
   * (`cb.toggle(...)`, `.map`, `.split`, …) and re-rendered from state on every
   * `toJSON()`. `id` owns the `checkbox/<id>/*` route namespace; the built-in
   * checkbox router turns a tap into a selection change (per `config`) and edits
   * the message in place — no `@Action` to write. The group is just part of the
   * keyboard, so your own buttons (`.row(...)`) compose around it.
   *
   * Declare it once (a provider or a `render()` reused for mount + re-render) so
   * it survives restarts; an inline keyboard thrown straight from a handler works
   * too, but its registration is lost on restart (state in the session store is
   * not — the user just re-opens).
   *
   * Two rules make the re-render correct:
   * - **`id` must be static** — one per checkbox TYPE, never per user (`` `tags:${userId}` ``
   *   leaks the registry and routes stale keyboards into newer ones). Per-user
   *   state comes from the session, keyed by the conversation, not from the id.
   * - **`build` must purely READ state** — it re-runs on every `toJSON()` (which
   *   may fire more than once per response), so it must not write or have side
   *   effects, and must read state fresh from the ambient/service inside, never
   *   capture a request-scoped local.
   *
   * One checkbox group per keyboard (a second `.checkboxes()` throws).
   *
   * ```ts
   * new InlineKeyboard()
   *   .checkboxes('tags', (cb) =>
   *     cb.map(TAGS, (t) => cb.toggle(t.name, t.id)).split(1))
   *   .row(Button.text('✓ Done', 'tags/done'));
   * ```
   */
  checkboxes(
    id: string,
    build: CheckboxBuilder,
    config: CheckboxConfig = {},
  ): this {
    if (this.checkboxSection !== undefined) {
      throw new NestgramConfigError(
        'A keyboard can hold one checkbox group; call .checkboxes() once per keyboard.',
      );
    }
    if (this.pending.length > 0) {
      this.row(); // commit any loose buttons before the section starts
    }
    if (InlineKeyboard.checkboxRegistry.has(id)) {
      InlineKeyboard.logger.warn(
        `A checkbox group with id "${id}" is already registered — the newer one ` +
          "wins and the older one's buttons will route to it. Give each a unique id.",
      );
    }
    this.checkboxSection = {
      id,
      build,
      binding: new CheckboxBinding(id, config),
      at: this.rows.length,
    };
    InlineKeyboard.checkboxRegistry.set(id, this);
    return this;
  }

  /** The keyboard owning checkbox group `id` — used by the built-in checkbox router. */
  static resolveCheckbox(id: string): InlineKeyboard | undefined {
    return InlineKeyboard.checkboxRegistry.get(id);
  }

  /** Apply a tap on `item` to checkbox group `id` (toggle/radio + persist). */
  applyCheckboxToggle(id: string, item: string): void {
    const section = this.checkboxSection;
    if (section?.id === id) {
      section.binding.applyToggle(item);
    }
  }

  /** This keyboard's checkbox selection — what `@CheckboxIds(id)` reads on Done. */
  checkboxSelection(): string[] {
    return this.checkboxSection
      ? [...this.checkboxSection.binding.selected()]
      : [];
  }

  /**
   * Adopt an existing keyboard (a native `reply_markup` from an incoming update)
   * for editing — change a button, drop one, append a row, then send it back
   * with `editReplyMarkup`. The source markup is left untouched.
   *
   * ```ts
   * InlineKeyboard.from(query.message.reply_markup)
   *   .setText(`toggle/${id}`, `☑ ${label}`)
   *   .row(Button.text('Done', 'done'));
   * ```
   */
  static from(markup: RawInlineKeyboardMarkup): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    keyboard.adopt(markup.inline_keyboard);
    return keyboard;
  }

  /**
   * Replace every button the matcher selects. The matcher is a **route** (a
   * concrete `'toggle/3'` hits one button; a template `'toggle/:id'` hits all
   * that fit, with the captured params passed to `patch`) or a predicate over
   * the `Button`. Addresses a button without caring where it sits in the grid.
   */
  update(
    matcher: ButtonMatcher,
    patch: (button: Button, params: Record<string, string>) => Button,
  ): this {
    const test = InlineKeyboard.matcher(matcher);
    for (const row of this.rows) {
      for (let index = 0; index < row.length; index++) {
        const params = test(row[index]);
        if (params !== null) {
          row[index] = patch(Button.from(row[index]), params).toJSON();
        }
      }
    }
    return this;
  }

  /** Change the label of every button the matcher selects (a common `update`). */
  setText(matcher: ButtonMatcher, text: string): this {
    return this.update(matcher, (button) => button.withText(text));
  }

  /**
   * Relabel a button found by its current text. A convenience for the i18n-free
   * quick case; prefer a route (`setText('toggle/3', …)`) when you have one —
   * labels drift and are localised, a route is the stable key.
   */
  replaceText(oldText: string, newText: string): this {
    return this.setText((button) => button.label === oldText, newText);
  }

  /** Remove every button the matcher selects, collapsing rows left empty. */
  remove(matcher: ButtonMatcher): this {
    const test = InlineKeyboard.matcher(matcher);
    for (let row = 0; row < this.rows.length; row++) {
      this.rows[row] = this.rows[row].filter((button) => test(button) === null);
    }
    this.compactRows();
    return this;
  }

  /** Replace the button at a grid position (row, column) — position addressing. */
  updateAt(row: number, col: number, patch: (button: Button) => Button): this {
    const target = this.rows[row]?.[col];
    if (target !== undefined) {
      this.rows[row][col] = patch(Button.from(target)).toJSON();
    }
    return this;
  }

  /** Remove the button at a grid position, collapsing a row left empty. */
  removeAt(row: number, col: number): this {
    if (this.rows[row]?.[col] !== undefined) {
      this.rows[row].splice(col, 1);
      this.compactRows();
    }
    return this;
  }

  toJSON(): RawInlineKeyboardMarkup {
    const own = this.filledRows;
    const section = this.checkboxSection;
    if (section === undefined) {
      return { inline_keyboard: own };
    }
    // Re-render the checkbox section fresh: read the current selection once and
    // hand it to the scope, so `cb.toggle` auto-marks each item.
    const scope = new CheckboxScope(
      section.id,
      section.binding.multi,
      section.binding.selected(),
    );
    section.build(scope);
    const rendered = scope.toJSON().inline_keyboard;
    const at = Math.min(section.at, own.length);
    return {
      inline_keyboard: [...own.slice(0, at), ...rendered, ...own.slice(at)],
    };
  }

  /** Resolve each button's `.if()`/`.else()` into the raw buttons to render. */
  private static resolve(buttons: Button[]): RawInlineKeyboardButton[] {
    return buttons
      .map((button) => button.resolve())
      .filter((button): button is Button => button !== null)
      .map((button) => button.toJSON());
  }

  /**
   * Compile a matcher into a test: given a raw button, return the captured route
   * params when it matches, or `null`. A route string compiles to a pattern (so
   * a concrete route matches one button, a templated route matches many); a
   * predicate matches with no captured params.
   */
  private static matcher(
    matcher: ButtonMatcher,
  ): (button: RawInlineKeyboardButton) => Record<string, string> | null {
    if (typeof matcher === 'function') {
      return (button) => (matcher(Button.from(button)) ? {} : null);
    }
    const pattern = CallbackRoutePattern.compile(matcher);
    return (button) =>
      button.callback_data === undefined
        ? null
        : pattern.match(button.callback_data);
  }
}

/** Per-button overrides for `cb.toggle` — both optional. */
export interface CheckboxToggleOptions {
  /** Override the checked state (default: whether `item` is in the group's selection). */
  active?: boolean;
  /** Override the checked/unchecked glyphs for this one button. */
  markers?: { on: string; off: string };
}

/**
 * The builder handed to `InlineKeyboard.checkboxes(id, build)`. It is a full
 * `InlineKeyboard` (so `.map`/`.split`/`.row`/… all work) plus `cb.toggle(...)`,
 * which renders a checkbox button routed into this group's `checkbox/<id>/*`
 * namespace and **auto-marked** from the group's current selection.
 *
 * Kept in this file (not its own) on purpose: it `extends InlineKeyboard` and is
 * constructed by `InlineKeyboard.toJSON()`, so splitting it out would form an
 * import cycle that breaks the `extends` at load time.
 */
export class CheckboxScope extends InlineKeyboard {
  constructor(
    private readonly checkboxId: string,
    private readonly multi: boolean,
    private readonly selection: ReadonlySet<string>,
  ) {
    super();
  }

  /**
   * A checkbox button as a `Button` value — drop it into `.map`/`.add`. `item` is
   * its id within the group; the marker (✅/'' for multi, 🔘/⚪ for radio) is set
   * automatically from whether `item` is currently selected. The framework routes
   * the tap and re-renders — you never write the toggle handler.
   *
   * Override per button with `opts.active` (force the marker) or `opts.markers`
   * (custom glyphs):
   *
   * ```ts
   * cb.map(items, (i) => cb.toggle(i.name, i.id)).split(2);
   * ```
   */
  toggle(
    label: string,
    item: string | number,
    opts?: CheckboxToggleOptions,
  ): Button {
    const active = opts?.active ?? this.selection.has(String(item));
    const glyphs =
      opts?.markers ??
      (this.multi ? CHECKBOX_DEFAULT_MARKERS : CHECKBOX_RADIO_MARKERS);
    const glyph = active ? glyphs.on : glyphs.off;
    return Button.from({
      text: glyph ? `${glyph} ${label}` : label,
      callback_data: CallbackRoutePattern.build(CHECKBOX_TOGGLE_ROUTE, {
        [CHECKBOX_PARAMS.cb]: this.checkboxId,
        [CHECKBOX_PARAMS.item]: String(item),
      }),
    });
  }

  /**
   * A Done button for the group — routes to `checkbox/<id>/done`, handled by a
   * `@OnCheckboxDone(id)` method (where `@CheckboxIds(id)` hands you the picks).
   * No magic route string to write.
   */
  done(label: string): Button {
    return Button.from({
      text: label,
      callback_data: CallbackRoutePattern.build(CHECKBOX_DONE_ROUTE, {
        [CHECKBOX_PARAMS.cb]: this.checkboxId,
      }),
    });
  }
}
