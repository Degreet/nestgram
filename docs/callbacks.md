---
title: Callbacks
description: Route inline-button taps as callback routes — @Action + @Param, answer the query, and edit the message in place.
sidebar:
  group: Events & replies
  order: 33
---

When a user taps an inline button, Telegram sends a **callback query** carrying
the `callback_data` you set on the button. Nestgram treats that data as a
**route**: `@Action()` matches it the way `@Get()` matches a URL, and `@Param()`
reads its segments through a pipe. A handler then does two things — answers the
query and, usually, edits the message the button lives on.

:::mental
button tap -> callback query -> @Action route -> @Param + answer + edit
:::

## Routing the tap

`@Action(template)` is a match predicate: `/` divides the `callback_data` into
segments and a leading `:` marks a parameter. It mirrors `@Get('users/:id')` —
`@Param('id', ParseIntPipe)` hands you the matched segment, decoded and
validated by any Nest pipe you name. The keyboard's `.text(label, route, params)`
builds the same template from the other side, and the template-literal types
require every `:param`, so the button and its route can't drift apart.

:::code[shop.router.ts]

```ts
import {
  Router,
  Command,
  Action,
  Param,
  Message,
  CallbackQuery,
  InlineKeyboard,
} from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class ShopRouter {
  @Command('shop')
  shop(message: Message) {
    const keyboard = new InlineKeyboard()
      .text('Buy #42', 'buy/:id', { id: 42 })
      .text('Info', 'info');

    return message.answer('One product today:', { reply_markup: keyboard });
  }

  // matches callback_data like `buy/42`
  @Action('buy/:id')
  buy(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    return query.answer(`Added product ${id} to cart`);
  }

  // matches callback_data === 'info'
  @Action('info')
  info(query: CallbackQuery) {
    return query.answer('Nestgram — the NestJS way');
  }
}
```

:::

The handler's first parameter is a typed `CallbackQuery` — positional, no
decorator, like every rich event. Under the hood `@Action`'s predicate
(`ActionPredicate`) reads the raw `callback_query.data`, matches the compiled
pattern, and exposes its named groups to `@Param`. No regex capture, no
`split(':')`, no magic string repeated across three files.

| `@Action(...)`         | Matches                                  |
| ---------------------- | ---------------------------------------- |
| `@Action('refresh')`   | `callback_data === 'refresh'` (exact)    |
| `@Action('buy/:id')`   | a route template; `@Param('id')` reads it |
| `@Action(/^legacy:/)`  | a regex; groups go to `@Param`, the array to `@Matches` |
| `@Action()`            | any callback query                        |

For a one-off button you can interpolate the value yourself —
`` .text('Buy', `buy/${id}`) `` — terser, but it skips the parameter check and
separator escaping, so keep it to plain numeric ids. When the data carries no
values at all, `@CallbackData()` injects the raw `query.data` string. The
keyboard builder lives in [Keyboards](/docs/keyboards);
the predicate forms above are part of [Match predicates](/docs/match-predicates).

## Answering the query

Every callback query must be answered, or the user stares at a spinning button
for up to a minute. `query.answer()` does it — backed by `answerCallbackQuery`,
which Telegram allows exactly once per query.

| Call                                     | Effect                              |
| ---------------------------------------- | ----------------------------------- |
| `query.answer()`                         | stop the spinner, no toast          |
| `query.answer('Saved!')`                 | a toast above the chat              |
| `query.answer('Saved!', { show_alert: true })` | a modal alert                |
| `query.alert('Saved!')`                  | shortcut for the `show_alert` form  |

You rarely have to remember this. The **auto-answer built-in**
(`AutoAnswerCallbackInterceptor`) is a global Nest interceptor that fires after
a callback handler returns successfully: if the handler never called
`query.answer()`, it answers with an empty `answerCallbackQuery` so the button
stops spinning. It only runs on success — a thrown error skips it and is left to
your exception filter.

:::note
It's a plain interceptor a bot author could have written, not privileged core —
proof of Nestgram's no-privileged-core principle. Opt one handler out with
`@NoAutoAnswer()` (you'll answer it yourself), or disable it globally with
`autoAnswerCallbackQueries: false` in `NestgramModule.forRoot`.
:::

## Editing the message in place

A callback usually mutates the message its button sits on. Nestgram makes this
symmetric to replying: just as a returned string replies to the same chat, a
returned keyboard or untargeted edit command acts on the **callback message** —
the `ResultHandler` fills in `chat_id`/`message_id` from the update, so you never
plumb them by hand. Three return shapes, increasing in how much they change:

| Return value                          | Edits                                   |
| ------------------------------------- | --------------------------------------- |
| `new InlineKeyboard()...`             | the message's reply markup only         |
| `new EditMessageText(...)` (untargeted) | the text (and markup, if set)         |
| `new EditMessageMedia(...)` (untargeted) | the media                            |

Return a keyboard to swap the buttons and leave the text alone:

:::code[toggle.router.ts]

```ts
import { Router, Action, Param, CallbackQuery, InlineKeyboard } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class ToggleRouter {
  @Action('pin/:id')
  pin(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    // Returned keyboard edits this message's markup in place — no chat_id/message_id.
    return new InlineKeyboard().text('📌 Pinned', 'unpin/:id', { id });
  }
}
```

:::

To change the text too, return an **untargeted** `EditMessageText` — leave
`chat_id`/`message_id` off and the framework aims it at the callback message. Set
either field yourself and your target wins; the auto-targeting only fills the
gap.

:::code[paginate.router.ts]

```ts
import {
  Router,
  Action,
  Param,
  CallbackQuery,
  InlineKeyboard,
  EditMessageText,
} from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class PaginateRouter {
  @Action('page/:n')
  paginate(query: CallbackQuery, @Param('n', ParseIntPipe) page: number) {
    const keyboard = new InlineKeyboard()
      .text('◀', 'page/:n', { n: page - 1 })
      .text(`${page}`, 'noop')
      .text('▶', 'page/:n', { n: page + 1 });

    // No chat_id/message_id — auto-targets the callback message.
    return new EditMessageText({ text: `Page ${page}`, reply_markup: keyboard });
  }
}
```

:::

When you need the message object directly — to edit conditionally, or call more
than once — reach for `query.message`. It's the `Message` the keyboard is
attached to, so the methods you already know apply: `editText`,
`editReplyMarkup`, `editMedia`. It's optional (`message?: Message`), though: a
button on an inline-mode message has no chat message to edit (only
`inline_message_id`), so guard it.

:::code[refresh.router.ts]

```ts
import { Router, Action, Param, CallbackQuery, InlineKeyboard } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class RefreshRouter {
  @Action('refresh/:n')
  async refresh(query: CallbackQuery, @Param('n', ParseIntPipe) page: number) {
    if (!query.message) {
      return query.answer(); // inline-mode message — nothing local to edit
    }

    await query.message.editText(`Page ${page}`, {
      reply_markup: new InlineKeyboard().text('Reload', 'refresh/:n', { n: page }),
    });
    return query.answer('Reloaded');
  }
}
```

:::

:::caution
If the bot's own message has aged out or been deleted, a framework-targeted edit
warns rather than throws — the auto-targeting was ours, not your explicit
request. An edit you target yourself (`query.message.editText`) raises the API
error as usual.
:::

## The reserved no-op segment

A dummy button — a page counter, a section header — should stop its own spinner
and nothing more. `Button.noop()` (and `.else('label')` in the keyboard builder)
emits the reserved `callback_data` `__nestgram_noop__`, and a built-in handler
matches it, answers the query, and returns. That reserved value is off-limits as
your own route; everything else is yours.

A button whose `callback_data` matches **no** `@Action` route logs a
**dead-button** warning when pressed, so a typo in a route surfaces in
development. That warning is itself an `@OnUnhandled` handler — see
[Match predicates](/docs/match-predicates) for `@OnUnhandled` and the
`warnUnhandledCallbacks` toggle.
