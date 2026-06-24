---
title: Keyboards
description: Build inline and reply keyboards with a chainable builder — dynamic from data, conditional buttons and sections, styled, and edited in place.
sidebar:
  group: Keyboards
  order: 50
---

A keyboard rides along with a message under the normal `reply_markup` option. The
options bag mirrors the Telegram API, so `reply_markup` autocompletes and accepts
a keyboard builder directly — `JSON.stringify` calls its `toJSON()` when the
request goes out. Two builders cover the two Telegram keyboards: `InlineKeyboard`
for buttons attached _to_ a message, `ReplyKeyboard` for the custom keyboard under
the input field.

This page is the stateless layer — you build a keyboard, hand it over, done. The
[Callbacks](/docs/callbacks) page owns what happens when an inline button is
pressed (routing the tap to an `@Action`). Selection-aware keyboards that own
their own state — checkboxes, radio groups, pagination — live in
[Stateful keyboards](/docs/stateful-keyboards).

## Inline keyboards

`new InlineKeyboard()` accumulates buttons; chained calls build it up. `.text()`
adds a callback button, `.url()` a link button, and `.row()` ends the current
row so the next buttons start a fresh one.

:::code[menu.router.ts]

```ts
import { Router, Command, Message, InlineKeyboard } from 'nestgram';

@Router()
export class MenuRouter {
  @Command('menu')
  menu(message: Message) {
    const keyboard = new InlineKeyboard()
      .text('Buy', 'buy')
      .text('Info', 'info')
      .row()
      .url('Website', 'https://nestgram.vercel.app');

    return message.answer('What would you like?', { reply_markup: keyboard });
  }
}
```

:::

The second argument to `.text()` is the button's **callback route** — the string
sent back when the button is pressed. Routing that press to a handler (and
carrying typed data in the route, `buy/42`-style, with no magic strings) is the
[Callbacks](/docs/callbacks) page; here, just know the string is what identifies
the button.

Beyond `.text()` and `.url()`, the everyday button kinds have fluent shortcuts:

| Method                            | Button                                          |
| --------------------------------- | ----------------------------------------------- |
| `.text(label, route)`             | callback button — press sends `route` back       |
| `.url(label, url)`                | opens the link                                  |
| `.webApp(label, url)`             | opens the Mini App at `url`                      |
| `.switchInline(label, query?)`    | switch to inline mode in another chat            |
| `.switchInlineCurrent(label, q?)` | switch to inline mode in the current chat        |
| `.copyText(label, text)`          | copies `text` to the clipboard                   |

The kinds without a shortcut (a pay button, a login button) are reachable through
`.add(...)` and the `Button` value object — see [Dynamic keyboards](#dynamic-keyboards).

## The Button value object

A button is also a first-class value: `Button`. Every Bot API inline-button kind
has a static constructor — `Button.text`, `Button.url`, `Button.webApp`,
`Button.switchInline`, `Button.copyText`, `Button.loginUrl`, `Button.pay`,
`Button.noop` — and the value carries the same callback-route argument as the
fluent method:

:::code[button-examples.ts]

```ts
import { Button } from 'nestgram';

Button.text('Buy', 'buy/:id', { id: 42 }); // a callback button with a route param
Button.url('Docs', 'https://nestgram.vercel.app');
Button.pay('Pay'); // a kind with no fluent shortcut
```

:::

A `Button` is immutable: `.if()`, `.else()`, `.withText()` and the colour
modifiers each return a _new_ value, never mutating the original. That is what
makes a button safe to map over a collection and reuse. You hand buttons to a
keyboard through `.add(...)` or `.map(...)`, both below.

## Dynamic keyboards

When the buttons come from data, don't hand-roll a loop. `.map(items, fn)` runs
`fn` per item — return a `Button` to add it, or a falsy value to skip one — and a
layout method commits the accumulated buttons into rows:

:::code[catalog.keyboard.ts]

```ts
import { InlineKeyboard, Button } from 'nestgram';

interface Product {
  id: number;
  name: string;
}

export function catalogKeyboard(products: Product[]): InlineKeyboard {
  return new InlineKeyboard()
    .map(products, (p) => Button.text(p.name, 'buy/:id', { id: p.id }))
    .split(2)
    .row(Button.url('Catalog', 'https://shop.dev'));
}
```

:::

Buttons accumulate, then a layout method arranges the batch:

| Method            | Lays the accumulated buttons out as…                       |
| ----------------- | ---------------------------------------------------------- |
| `.split(n)`       | rows of `n` (`.map(...).split(2)` ≡ `.text().text().split(2)`) |
| `.spread()`       | one button per row (`.split(1)`)                            |
| `.row(...btns)`   | a single row (any buttons passed are added first)          |
| `.group(build)`   | a block of rows from a sub-builder — for an irregular section |

`.add(...buttons)` is the universal inlet: it takes `Button` values straight into
the current row, so the kinds without a fluent shortcut are reachable —
`.add(Button.pay('Pay'))`. Anything `.map()` returns, `.add()` accepts too.

## Conditional buttons and sections

`.if(condition)` keeps the **last unit** — whatever was just produced: a button,
a row, a `.split()` section, or a `.group()` — only when `condition` is true. One
verb covers every scope:

:::code[admin-menu.keyboard.ts]

```ts
import { InlineKeyboard, Button } from 'nestgram';

interface Item {
  id: number;
  label: string;
}

export function adminMenu(items: Item[], isAdmin: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .map(items, (i) => Button.text(i.label, 'pick/:id', { id: i.id }))
    .split(3) // a 3-wide grid for everyone
    .group((kb) => kb.text('Stats', 'stats').text('Ban', 'ban').split(2))
    .if(isAdmin); // ...plus an admin block, only for admins
}
```

:::

`.if()` consumes the unit either way, so a following `.if()` can't re-target it —
`.text(...).if(true).if(false)` keeps the button.

For the per-item filter _inside_ `.map()`, condition the single `Button` with
`Button.if(...)`. Add `.else(...)` to give it a fallback when hidden — a label
becomes a dead-end button (a no-op press), or pass a full `Button`:

:::code[shop.keyboard.ts]

```ts
import { InlineKeyboard, Button } from 'nestgram';

interface Product {
  id: number;
  name: string;
  inStock: boolean;
}

export function shopKeyboard(products: Product[]): InlineKeyboard {
  return new InlineKeyboard().map(products, (p) =>
    Button.text(p.name, 'buy/:id', { id: p.id }).if(p.inStock).else('Sold out'),
  );
}
```

:::

:::tip
Use `Button.if()` for the per-item filter inside `.map()`, and the builder's
`.if()` for a whole row, section, or group. They read the same but target
different scopes.
:::

## Colouring buttons

Telegram lets a button carry a `style`: `primary` (blue), `success` (green), or
`danger` (red). On the builder, a colour modifier styles the button **just
added** — postfix, so it reads like a label on the button it follows:

:::code[confirm.keyboard.ts]{mark="6,8"}

```ts
import { InlineKeyboard } from 'nestgram';

export function confirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Confirm', 'confirm')
    .success()
    .text('Cancel', 'cancel')
    .danger()
    .text('Later', 'later'); // no modifier → the app's default style
}
```

:::

A `Button` value styles the same way and returns a new value —
`Button.text('Delete', 'del').danger()` — so it works inside `.map()` and
`.add()` too. The same `.primary()`/`.success()`/`.danger()` modifiers work on a
`ReplyKeyboard`.

## Editing a keyboard in place

Often you already have a keyboard — the one on the message a button press came
from — and just want to tweak it: relabel a button, drop one, append a row.
`InlineKeyboard.from(markup)` adopts an existing `reply_markup` (a deep copy — the
source is left untouched), and you address a button by its **route**, the same
string that built it:

:::code[toggle.router.ts]

```ts
import { Router, Action, CallbackQuery, Param, InlineKeyboard } from 'nestgram';

@Router()
export class ToggleRouter {
  @Action('toggle/:id')
  toggle(query: CallbackQuery, @Param('id') id: string) {
    if (query.message?.reply_markup === undefined) return;

    const next = InlineKeyboard.from(query.message.reply_markup)
      .setText(`toggle/${id}`, '☑ Done') // a concrete route → one button
      .remove('cancel'); // drop the cancel button

    return query.message.editReplyMarkup(next);
  }
}
```

:::

The matcher is the load-bearing part. A **concrete** route (`toggle/3`) addresses
one button; a **template** (`toggle/:id`) addresses every button that fits, with
the captured params handed to the patch. The full set of addressing methods:

| Method                              | Addresses a button by…                            |
| ----------------------------------- | ------------------------------------------------- |
| `.setText(matcher, text)`           | route or predicate → relabel                      |
| `.update(matcher, patch)`           | route or predicate → arbitrary patch              |
| `.replaceText(oldText, newText)`    | current visible text → relabel                    |
| `.remove(matcher)`                  | route or predicate → drop, collapsing empty rows  |
| `.updateAt(row, col, patch)`        | grid position → patch                             |
| `.removeAt(row, col)`               | grid position → drop                              |

A predicate matcher is a `(button: Button) => boolean`, so
`.update((b) => b.label === 'Old', …)` addresses by anything the `Button` exposes.
Prefer a route over visible text where you have one — labels drift and get
localised, a route is the stable key.

:::note
`.from()` is for editing markup off an incoming update. To build a keyboard from
scratch you don't need it — `new InlineKeyboard()` is the start.
:::

## Reply keyboards

`ReplyKeyboard` is the same builder shape for the custom keyboard under the input
field. The layout methods (`.split(n)`, `.row()`, `.spread()`, `.if(cond)`) and
the colour modifiers are identical; only the button kinds and the keyboard-level
flags differ:

:::code[menu.keyboard.ts]

```ts
import { ReplyKeyboard } from 'nestgram';

export function menuKeyboard(): ReplyKeyboard {
  return new ReplyKeyboard()
    .text('My orders')
    .text('Help')
    .row()
    .text('Settings')
    .placeholder('Pick an option…')
    .resize()
    .oneTime();
}
```

:::

Beyond plain `.text()`, there is a method per Bot API reply-button kind —
`.requestContact()`, `.requestLocation()`, `.requestPoll()`, `.webApp()`,
`.requestUsers()`, `.requestChat()`. The keyboard-level flags are named for
discoverability but map exactly onto the Telegram markup options:

| Method            | Telegram option            |
| ----------------- | -------------------------- |
| `.resize()`       | `resize_keyboard`          |
| `.oneTime()`      | `one_time_keyboard`        |
| `.persistent()`   | `is_persistent`            |
| `.selective()`    | `selective`                |
| `.placeholder(t)` | `input_field_placeholder`  |

To take a reply keyboard away again, return `new RemoveKeyboard()` as the
`reply_markup`:

:::code[done.router.ts]

```ts
import { Router, Command, Message, RemoveKeyboard } from 'nestgram';

@Router()
export class DoneRouter {
  @Command('done')
  done(message: Message) {
    return message.answer('Cleared.', { reply_markup: new RemoveKeyboard() });
  }
}
```

:::

## Where to go next

- [Callbacks](/docs/callbacks) — route an inline button press to an `@Action`
  handler and read its route params.
- [Stateful keyboards](/docs/stateful-keyboards) — checkboxes, radio groups, and
  pagination: keyboards that own a per-message selection and re-render themselves
  on a tap, with no toggle or nav handler of your own.
