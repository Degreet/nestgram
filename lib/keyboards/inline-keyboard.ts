import type {
  RawInlineKeyboardButton,
  RawInlineKeyboardMarkup,
} from '../events/raw-update.types';
import { CallbackRoutePattern } from '../callback-data';
import { Button } from './button';
import { KeyboardBuilder } from './keyboard-builder';
import { RouteParamArgs } from './route-params.types';

/**
 * How an edit addresses a button: a **route** (`'toggle/3'` for one, `'toggle/:id'`
 * for all that fit) or a predicate over the `Button`. Position addressing uses
 * `.updateAt()`/`.removeAt()` instead.
 */
type ButtonMatcher = string | ((button: Button) => boolean);

/**
 * Fluent builder for an inline keyboard (buttons attached under a message).
 *
 * Three ways in, one model — a button is a value ({@link Button}):
 *
 * - **fluent shortcuts** for the everyday kinds — `.text()`, `.url()`,
 *   `.webApp()`, `.switchInline()` — each with a trailing `hidden` flag for
 *   conditional buttons (`.text('Admin', 'admin', !isAdmin)`);
 * - **`.add(...buttons)`** takes `Button` values directly — the universal inlet,
 *   so every Bot API kind is reachable (`.add(Button.pay('Pay'))`);
 * - **`.map(items, fn)`** turns a collection into buttons, so a dynamic keyboard
 *   reads as data, not a loop.
 *
 * `.row()` starts a new row (`.row(...buttons)` lays an explicit one),
 * `.columns(n)` auto-wraps into a grid, and a colour modifier
 * (`.primary()`/`.success()`/`.danger()`) styles the next button. Pass the
 * instance as `reply_markup` — `JSON.stringify` calls `toJSON()`.
 *
 * ```ts
 * new InlineKeyboard()
 *   .map(products, (p) => Button.text(p.name, 'buy/:id', { id: p.id }))
 *   .columns(2)
 *   .row(Button.url('Catalog', site));
 * ```
 */
export class InlineKeyboard extends KeyboardBuilder<RawInlineKeyboardButton> {
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
   * `@Action('reminder/done/:id')` + `@Param('id')`.
   */
  text<T extends string>(
    label: string,
    route: T,
    ...rest: RouteParamArgs<T>
  ): this;
  text(
    label: string,
    route: string,
    paramsOrHidden?: Record<string, string | number> | boolean,
    hidden = false,
  ): this {
    const assembled = typeof paramsOrHidden === 'object';
    const callbackData = assembled
      ? CallbackRoutePattern.build(route, paramsOrHidden)
      : route;
    const isHidden =
      typeof paramsOrHidden === 'boolean' ? paramsOrHidden : hidden;
    this.push({ text: label, callback_data: callbackData }, isHidden);
    return this;
  }

  /** A URL button: pressing it opens the link. */
  url(label: string, url: string, hidden = false): this {
    return this.add1(Button.url(label, url), hidden);
  }

  /** A Web App button: pressing it opens the Mini App at `url`. */
  webApp(label: string, url: string, hidden = false): this {
    return this.add1(Button.webApp(label, url), hidden);
  }

  /** Switch to inline mode in another chat, pre-filling `query`. */
  switchInline(label: string, query = '', hidden = false): this {
    return this.add1(Button.switchInline(label, query), hidden);
  }

  /** Switch to inline mode in the current chat, pre-filling `query`. */
  switchInlineCurrent(label: string, query = '', hidden = false): this {
    return this.add1(Button.switchInlineCurrent(label, query), hidden);
  }

  /** Copy `text` to the clipboard when pressed. */
  copyText(label: string, text: string, hidden = false): this {
    return this.add1(Button.copyText(label, text), hidden);
  }

  /**
   * Add `Button` values into the current flow (honoring `.columns()`). The
   * universal inlet — every Bot API button kind is reachable as a `Button`,
   * including the special ones (`.add(Button.pay('Pay'))`).
   */
  add(...buttons: Button[]): this {
    for (const button of buttons) {
      this.push(button.toJSON());
    }
    return this;
  }

  /**
   * Turn a collection into buttons. `fn` returns a `Button` for each item, or a
   * falsy value to drop it — so conditional buttons need no separate filter. The
   * buttons feed the current flow, so `.columns(n)` lays them into a grid.
   *
   * ```ts
   * .columns(2).map(items, (i) => Button.text(i.label, 'pick/:id', { id: i.id }))
   * ```
   */
  map<T>(
    items: readonly T[],
    fn: (item: T, index: number) => Button | null | undefined | false,
  ): this {
    items.forEach((item, index) => {
      const button = fn(item, index);
      if (button) {
        this.push(button.toJSON());
      }
    });
    return this;
  }

  /**
   * Start a new row. With buttons, lay exactly those into it (ignoring
   * `.columns()`) — an explicit row; with none, just open a fresh row for the
   * buttons that follow.
   */
  row(...buttons: Button[]): this {
    if (buttons.length === 0) {
      return super.row();
    }
    this.pushRow(buttons.map((button) => button.toJSON()));
    super.row();
    return this;
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
    return { inline_keyboard: this.filledRows };
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

  /** Push one `Button` through the column flow, honoring a trailing `hidden` flag. */
  private add1(button: Button, hidden: boolean): this {
    this.push(button.toJSON(), hidden);
    return this;
  }
}
