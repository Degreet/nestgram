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

| Decorator          | Gives you                                       |
| ------------------ | ----------------------------------------------- |
| `@Param('name')`   | a named segment captured from the command route |
| `@Sender()`        | the `User` who triggered the update             |
| `@Chat()`          | the `RawChat` the update happened in            |
| `@Args()`          | raw command arguments (`string[]`)              |
| `@Payload()`       | raw text after the command                      |
| `@CallbackData()`  | a callback query's `data` string                |
| `@Session()`       | the current session object                      |

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

### Colouring buttons

Telegram lets a button carry a `style`: `primary` (blue), `success` (green) or
`danger` (red). A colour modifier styles the **next** button only, so it reads
like a label on the button it precedes:

:::code[confirm.router.ts]{mark="2,4"}

```ts
const keyboard = new InlineKeyboard()
  .success()
  .text('Confirm', 'confirm')
  .danger()
  .text('Cancel', 'cancel')
  .text('Later', 'later'); // no modifier → the app's default style
```

:::

The modifier is one-shot (`Later` above stays default) and is consumed even
when the button is hidden — so a conditional button never leaks its colour onto
the next one: `.danger().text('Delete', 'del', !canDelete)` simply drops when
`canDelete` is false. The same `.primary()`/`.success()`/`.danger()` work on a
`ReplyKeyboard`.

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
`one_time_keyboard` flags, and `.placeholder()` sets the grey
`input_field_placeholder` — named for discoverability, but the underlying
markup is exactly what the API expects.

## answer vs reply

- `message.answer(text)` sends a new message to the same chat.
- `message.reply(text)` sends it as a Telegram reply (quoting the original).

Both accept the full set of `SendMessage` options as a second argument.
