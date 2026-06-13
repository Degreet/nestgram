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

`@Command('start')` matches `/start`. The text after the command is
available without any string-slicing of your own.

:::code[order.router.ts]

```ts
import { Router, Command, Message, Args, Payload } from 'nestgram';

@Router()
export class OrderRouter {
  // /order 3 large
  @Command('order')
  order(message: Message, @Args() args: string[], @Payload() payload: string) {
    // args    → ['3', 'large']
    // payload → '3 large'
    const [count, size] = args;
    return `Ordering ${count} × ${size} size`;
  }
}
```

:::

- `@Args()` gives the whitespace-split arguments.
- `@Payload()` gives the raw remainder — handy for deep links like
  `/start ref_123`, where `payload === 'ref_123'`.

### Typed arguments

`string[]` plus hand-parsing is fine for one command and tedious for ten.
Declare the arguments once with `commandArgs(...)`, attach the schema to the
command, and the same `@Args()` hands you a typed, coerced object:

:::code[todo.router.ts]

```ts
import { Router, Command, Message, Args, commandArgs, ArgsOf } from 'nestgram';

const AddArgs = commandArgs({ amount: Number, note: String });

@Router()
export class TodoRouter {
  // /add 3 buy milk
  @Command('add', AddArgs)
  add(message: Message, @Args() args: ArgsOf<typeof AddArgs>) {
    // args.amount → 3 (a real number), args.note → 'buy milk'
    return `Added ${args.amount} × "${args.note}"`;
  }
}
```

:::

The last field is greedy — it keeps the rest of the message in one piece, so
free text survives. A missing argument or one that doesn't fit its type
throws a `CommandArgsError`, which an exception filter can turn into a usage
reply. No `split`, no index, no `Number(...)` of your own.

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

| Decorator         | Gives you                                            |
| ----------------- | ---------------------------------------------------- |
| `@Sender()`       | the `User` who triggered the update                  |
| `@Chat()`         | the `RawChat` the update happened in                 |
| `@Args()`         | command arguments — `string[]`, or typed by a schema |
| `@Payload()`      | raw text after the command                           |
| `@CallbackData()` | a callback query's `data` string                     |
| `@Session()`      | the current session object                           |

This is the everyday set, not the full list — `@Text()`, `@Caption()`,
`@Locale()`, `@StartPayload()` and friends follow the same pattern: a named
read of something the update already carries.

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
