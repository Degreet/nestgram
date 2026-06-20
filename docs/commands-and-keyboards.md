---
title: Commands, parameters & keyboards
description: Parse commands, pull values with parameter decorators, and build inline and reply keyboards.
sidebar:
  label: Commands & keyboards
  group: Keyboards
  order: 50
---

Now that updates reach your router, let's make handlers expressive: parse
command arguments, pull just the values you need, and send keyboards.

## Commands and their arguments

`@Command('start')` matches `/start`. To read arguments, name them in the
template — the command becomes a **route**: `:param` captures one token, a
trailing `:rest...` captures the remainder, and `@Param()` hands you each
segment. A pipe decodes and validates it the Nest-native way, exactly like
`@Get('order/:count')` with `ParseIntPipe` in an HTTP controller:

:::code[order.router.ts]

```ts
import { Router, Command, Message, Param } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class OrderRouter {
  // /order 3 large
  @Command('order :count :size')
  order(
    message: Message,
    @Param('count', ParseIntPipe) count: number,
    @Param('size') size: string,
  ) {
    return `Ordering ${count} × ${size} size`;
  }
}
```

:::

Matching is **exact-arity**: `@Command('order :count :size')` matches `/order`
with exactly two arguments, never a bare `/order`. That makes handlers disjoint
by shape — declare a shorter route alongside it and the message's argument count
picks the right one (arity overloading):

:::code[todo.router.ts]

```ts
import { Router, Command, Message, Param } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class TodoRouter {
  // /add 3 buy oat milk → amount 3, note "buy oat milk"
  @Command('add :amount :note...')
  add(
    message: Message,
    @Param('amount', ParseIntPipe) amount: number,
    @Param('note') note: string,
  ) {
    return `Added ${amount} × "${note}"`;
  }

  // /add 3 → a different handler, chosen by argument count
  @Command('add :amount')
  quickAdd(message: Message, @Param('amount', ParseIntPipe) amount: number) {
    return `Added ${amount}`;
  }
}
```

:::

A trailing `:note...` is greedy — it keeps the rest of the message in one
piece, so free text survives. A value that doesn't fit its pipe throws (e.g.
`ParseIntPipe` on `/add abc`), which an exception filter can turn into a usage
reply — no `split`, no index, no `Number(...)` of your own. For the
unstructured token list, `@Args()` still gives the whitespace-split arguments
after the command and `@Payload()` the raw remainder.

## Parameter decorators

The main event is always positional and typed. Parameter decorators are for
**derived or cross-cutting** values — things you _could_ read off the event
but want named directly:

:::code[whoami.router.ts]

```ts
import { Router, Command, Sender, Chat, User, RawChat } from 'nestgram';

@Router()
export class WhoAmIRouter {
  @Command('whoami')
  whoami(@Sender() user: User, @Chat() chat: RawChat) {
    return `You are ${user.first_name} (id ${user.id}) in chat ${chat.id}`;
  }
}
```

:::

| Decorator         | Gives you                                       |
| ----------------- | ----------------------------------------------- |
| `@Param('name')`  | a named segment captured from the command route |
| `@Sender()`       | the `User` who triggered the update             |
| `@Chat()`         | the `RawChat` the update happened in            |
| `@Args()`         | raw command arguments (`string[]`)              |
| `@Payload()`      | raw text after the command                      |
| `@CallbackData()` | a callback query's `data` string                |
| `@Session()`      | the current session object                      |

This is the everyday set, not the full list — `@Text()`, `@Caption()` and
`@Locale()` follow the same pattern: a named read of something the update
already carries.

:::note
These never collide with type names — `@Sender()` is a decorator, `User` is
a type, and you can import both. That collision is exactly what we avoid by
keeping the main event positional.
:::

## Inline keyboards

Build keyboards with a chainable builder and pass them through the normal
`reply_markup` option — the options bag mirrors the Telegram API, so
everything autocompletes.

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

`.row()` starts a new row; consecutive calls share the current one. Handling
the `buy` press — and carrying typed data in a button (`buy:42`-style)
without magic strings — is the next page,
[Callbacks →](/docs/callbacks).

### Dynamic keyboards

When the buttons come from data, a button is a value (`Button`) and `.map()`
lays a collection out — no hand-rolled loop:

:::code[catalog.router.ts]

```ts
import { InlineKeyboard, Button } from 'nestgram';

const keyboard = new InlineKeyboard()
  .map(products, (p) => Button.text(p.name, 'buy/:id', { id: p.id }))
  .split(2)
  .row(Button.url('Catalog', 'https://shop.dev'));
```

:::

Buttons accumulate, then a layout method commits them: `.split(n)` cuts the
accumulated buttons into rows of `n`, `.spread()` is one per row, and `.row()`
commits a single row — so `.map(...).split(2)` reads the same as
`.text().text().split(2)`. `.map(items, fn)` runs `fn` per item; return a
`Button` to add it, or a falsy value to skip one. `.add(...buttons)` is the
universal inlet: every Bot API kind has a `Button` constructor (`Button.webApp`,
`Button.switchInline`, `Button.copyText`, `Button.pay`, …), so
`.add(Button.pay('Pay'))` reaches the ones without a fluent shortcut.

### Conditional buttons & sections

`.if(condition)` keeps the **last unit** — a button, a row, a `.split()` section
or a `.group()` — only when `condition` is true. One verb for every scope:

:::code[menu.router.ts]

```ts
new InlineKeyboard()
  .map(items, (i) => Button.text(i.label, 'pick/:id', { id: i.id }))
  .split(3) // a 3-wide grid for everyone
  .group((kb) => kb.text('Stats', 'stats').text('Ban', 'ban').split(2))
  .if(isAdmin); // ...plus an admin block, only for admins
```

:::

Inside `.map()` you condition a single button with `Button.if(...)` — and
`.else(...)` gives it a fallback when hidden (a label becomes a dead-end button,
or pass a full `Button`):

:::code[shop.router.ts]

```ts
.map(products, (p) =>
  Button.text(p.name, 'buy/:id', { id: p.id }).if(p.inStock).else('Sold out'),
);
```

:::

Use `Button.if()` for the per-item filter inside `.map()`, and the builder's
`.if()` for a whole row, section or group.

### Pagination

A long list doesn't fit one screen. `.paginate(route, { size })` keeps only the
current page and appends a `‹ 2/5 ›` navigation row whose arrows route to `route`
with the target page number:

:::code[shop.router.ts]

```ts
import {
  Router,
  Command,
  Action,
  Param,
  Message,
  InlineKeyboard,
  Button,
} from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class ShopRouter {
  @Command('shop')
  open(message: Message) {
    return message.answer('Our products:', { reply_markup: this.page(0) });
  }

  @Action('shop/page/:n')
  turn(@Param('n', ParseIntPipe) n: number) {
    return this.page(n); // returning a keyboard edits the message in place
  }

  private page(page: number) {
    return new InlineKeyboard()
      .map(products, (p) => Button.text(p.name, 'buy/:id', { id: p.id }))
      .split(2)
      .paginate('shop/page/:n', { size: 8, page });
  }
}
```

:::

`route` is a template with exactly one `:param` for the page — handle it with
`@Action('shop/page/:n')` + `@Param('n')`, returning the keyboard at that page
(the bare-keyboard return edits the message in place). `size` is the max buttons
per page; rows stay whole, so a `.split(2)` grid paginates by pairs. One page
(everything fits) renders no controls. `.paginate(route, { size, page, prev, next })`
— `prev`/`next` override the `‹`/`›` labels.

### Checkboxes and radio groups

A multi-select picker is the same builder with one method — `.checkboxes()`. The
framework owns the markers, the routing, the toggle, and the re-render, so **you
write no toggle handler**: a tap flips the selection and the message updates in
place.

:::code[notify.router.ts]

```ts
import {
  Router,
  Command,
  OnCheckboxDone,
  CheckboxIds,
  Message,
  InlineKeyboard,
} from 'nestgram';

@Router()
export class NotifyRouter {
  @Command('notify')
  open(message: Message) {
    return message.answer('Pick what to hear about:', {
      reply_markup: new InlineKeyboard().checkboxes('topics', (cb) =>
        cb
          .map(TOPICS, (t) => cb.toggle(t.name, t.id))
          .split(1)
          .row(cb.done('✓ Done')),
      ),
    });
  }

  @OnCheckboxDone('topics')
  save(@CheckboxIds('topics') topics: string[]) {
    return `Saved ${topics.join(', ')} ✅`;
  }
}
```

:::

`.checkboxes(id, build, config?)` carves out a group: inside `build` you have the
full keyboard sugar plus `cb.toggle(label, item)` — a checkbox button **auto-marked**
(✅/☐) from whether it's selected, so you never compute the marker. `cb.done(label)`
adds a Done button for the group, and `@OnCheckboxDone(id)` handles it with the
picks delivered straight to `@CheckboxIds(id)` — no route string, no toggle handler.
The selection lives in the session under `checkbox:<id>` by default.

That's the whole flow — `open` + a Done handler. A few knobs:

- **Radio:** `{ multi: false }` makes it single-select (one of `🔘`/`⚪`).
- **Custom store:** pass `{ onChange: (ids) => … }` (the whole set) or
  `{ onToggle: (id, on) => … }` (a per-item delta) to persist somewhere other than
  the session — a DB row, FSM data.
- **Static `id`, declare once:** the group registers by `id`, so use one stable id
  per checkbox _type_ (not per user — per-user state is the session's job). Throw it
  inline from a handler and it works for the life of the process; declare it once in
  a provider and it survives restarts (state in the session survives either way).

For full manual control — your own toggle `@Action`, custom routing — `Button.toggle`
is the low-level primitive the group is built on.

### Editing a keyboard

Often you already have a keyboard — the one on the message a button press came
from — and just want to tweak it: flip a checkbox, relabel, drop a button.
`InlineKeyboard.from(markup)` adopts it (a copy — the original is untouched) and
you address a button by its **route**, the same string that built and routes it:

:::code[todo.router.ts]

```ts
import { InlineKeyboard } from 'nestgram';

const next = InlineKeyboard.from(markup)
  .setText(`toggle/${id}`, '☑ Done') // a concrete route → one button
  .remove('cancel'); // drop a button

// send it back: query.message.editReplyMarkup(next)
```

:::

A concrete route (`toggle/3`) addresses one button; a template (`toggle/:id`)
addresses all that fit, with the captured params passed to the patch. You can
also address by predicate (`.update((b) => b.label === 'Old', …)`), by visible
text (`.replaceText('Old', 'New')`), or by position (`.updateAt(row, col, …)`).

### Colouring buttons

Telegram lets a button carry a `style`: `primary` (blue), `success` (green) or
`danger` (red). A colour modifier styles the button **just added**, so it reads
like a label on the button it follows:

:::code[confirm.router.ts]{mark="2,3"}

```ts
const keyboard = new InlineKeyboard()
  .text('Confirm', 'confirm')
  .success()
  .text('Cancel', 'cancel')
  .danger()
  .text('Later', 'later'); // no modifier → the app's default style
```

:::

A `Button` value styles the same way — `Button.text('Delete', 'del').danger()` —
so it works inside `.map()`/`.add()` too. The same
`.primary()`/`.success()`/`.danger()` work on a `ReplyKeyboard`.

## Reply keyboards

Same builder shape, for the custom keyboard under the input field:

:::code[menu.router.ts]

```ts
import { ReplyKeyboard } from 'nestgram';

const keyboard = new ReplyKeyboard()
  .text('My orders')
  .text('Help')
  .row()
  .text('Settings')
  .placeholder('Pick an option…')
  .resize()
  .oneTime();

return message.answer('Menu:', { reply_markup: keyboard });
```

:::

`.resize()` and `.oneTime()` map to the Telegram `resize_keyboard` and
`one_time_keyboard` flags, `.persistent()` to `is_persistent`, and
`.placeholder()` sets the grey `input_field_placeholder` — named for
discoverability, but the underlying markup is exactly what the API expects.

Beyond plain `.text()` there's a method per Bot API button kind —
`.requestContact()`, `.requestLocation()`, `.requestPoll()`, `.webApp()`,
`.requestUsers()` and `.requestChat()` — and the same `.split(n)`/`.row()`
layout and `.if(cond)` conditionals as an inline keyboard.

## answer vs reply

- `message.answer(text)` sends a new message to the same chat.
- `message.reply(text)` sends it as a Telegram reply (quoting the original).

Both accept the full set of `SendMessage` options as a second argument.
