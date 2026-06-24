---
title: Testing
description: Dispatch fake updates against your real routers with NestgramTestbed — the genuine engine, no Telegram connection, only the HTTP wire stubbed.
sidebar:
  label: Testing
  group: Tooling
  order: 110
---

A bot is just routers running through the Nest pipeline, so test it the way you'd
test a controller: feed it a request, assert on the reply. `NestgramTestbed` boots
your **real** routers and drives each fake update through the **real** engine —
discovery builds the route table, matching picks the handler, and guards /
interceptors / pipes / exception filters fire through `ExternalContextCreator`
exactly as in production. The only thing swapped is the HTTP boundary: a
`CaptureInterceptor`, appended last to the bot's outbound `apiInterceptors`,
records every Bot API call instead of sending it, so nothing ever reaches
Telegram.

:::mental
updates.command('start') -> UpdateDispatcher -> handler -> captured `sent`
:::

That fidelity is the point. A guard that denies, a pipe that transforms an arg, a
`parse_mode` default, an interceptor that mutates the request — all of it runs,
because it's the same pipeline, not a re-implementation. `create()` configures
**no transport** (polling and webhook are off), so the engine is wired up whole
and the testbed feeds the genuine `UpdateDispatcher` directly. You assert on what
the bot _would have sent_, and the wire is the only fake.

## Quickstart

A testbed is framework-agnostic — nothing in `nestgram/testing` imports Jest, the
harness just returns plain data you assert on with your own runner. Register a
router, dispatch an update, assert on the reply:

:::code[start.router.ts]

```ts
import { Router, Command, Message } from 'nestgram';

@Router()
export class StartRouter {
  @Command('start')
  start(message: Message): string {
    return `Hi ${message.from?.first_name}`;
  }
}
```

:::

:::code[start.router.spec.ts]

```ts
import { NestgramTestbed, updates } from 'nestgram/testing';
import { StartRouter } from './start.router';

describe('StartRouter', () => {
  let bot: NestgramTestbed;

  beforeEach(async () => {
    bot = await NestgramTestbed.create({ routers: [StartRouter] });
  });

  afterEach(() => bot.close());

  it('greets the sender', async () => {
    await bot.dispatch(updates.command('start'));

    expect(bot.lastMessage?.text).toBe('Hi Test');
  });
});
```

:::

`create()` boots a Nest application context (`NestFactory.createApplicationContext`,
logging off) with no transport, so the network is never touched. `close()` tears
the context down; call it in `afterEach`.

:::tip
`import { NestgramTestbed, updates } from 'nestgram/testing'`. The subpath keeps
the harness out of your runtime bundle. Both symbols are also re-exported from the
main `nestgram` barrel if you prefer a single import.
:::

### What `create` accepts

Pass `routers` (plus any `providers` they depend on) for a focused router test, or
`imports` (e.g. your real `AppModule`) for a wider one — or both. Everything below
mirrors `NestgramModule.forRoot`, since that's exactly what the testbed configures
under the hood.

| Option                      | Type                        | What it does                                                                                              |
| --------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `routers`                   | `Type[]`                    | Router classes (and other providers) to register.                                                         |
| `providers`                 | `Provider[]`                | Extra providers the routers depend on — services, mocks, …                                                |
| `imports`                   | `ModuleMetadata['imports']` | Whole modules to bring in (e.g. `AppModule`, `SessionsModule`).                                           |
| `token`                     | `string`                    | The bot token. Any non-empty string — it's never sent anywhere (defaults to `'TEST:token'`).             |
| `parseMode`                 | `ParseModeValue`            | Default `parse_mode` for sends, mirroring `NestgramModule.forRoot`.                                       |
| `autoAnswerCallbackQueries` | `boolean`                   | Auto-answer unanswered callback queries (on by default, as in production).                                |
| `replyExceptions`           | `boolean`                   | Map a thrown `ReplyException` / `AnswerException` to a reply via the built-in filter (on by default).     |
| `apiInterceptors`           | `Type<ApiInterceptor>[]`    | Outbound interceptors to test; they run **before** capture, so their request mutations show up in `sent`. |
| `keyboardState`             | `KeyboardStateOptions`      | Override the per-message keyboard-state store — pass `{ store }` to assert what a checkbox group persisted. |

The capture seam sits in that same outbound onion: your `apiInterceptors` run
first, then `CaptureInterceptor` last — so the built-in mutators (default
`parse_mode`, rich messages, the throttler position) have all run by the time the
request is recorded, and it short-circuits the wire before `fetch` is ever
reached.

## Building updates

`updates` is a ready-to-use `UpdateFactory` of well-formed fake updates. Every
builder fills sensible defaults — a private chat, a non-bot sender (`first_name:
'Test'`), an auto-incrementing `update_id` / `message_id`, a fixed `date` — so a
test states only what matters:

```ts
import { updates } from 'nestgram/testing';

await bot.dispatch(updates.message('hi'));
await bot.dispatch(updates.command('start', 'ref_42')); // → text '/start ref_42'
await bot.dispatch(updates.callbackQuery('menu:open'));
```

The builder set covers every routable update kind:

| Builder                                 | Update kind           | Builds                                                    |
| --------------------------------------- | --------------------- | --------------------------------------------------------- |
| `updates.message(text, o?)`             | `message`             | a plain text message                                      |
| `updates.command(name, args?, o?)`      | `message`             | `command('start')` → `/start`; the slash is added for you |
| `updates.editedMessage(text, o?)`       | `edited_message`      | an edited message                                         |
| `updates.channelPost(text, o?)`         | `channel_post`        | a post in a `channel` chat, no `from`                     |
| `updates.editedChannelPost(text, o?)`   | `edited_channel_post` | an edited channel post                                    |
| `updates.photo(caption?, o?)`           | `message`             | a message carrying a `photo` (+ optional caption)         |
| `updates.callbackQuery(data, o?)`       | `callback_query`      | an inline-button tap, carrying `data`                     |
| `updates.inlineQuery(query, o?)`        | `inline_query`        | `@bot query` typed in any chat                            |
| `updates.myChatMember(o?)`              | `my_chat_member`      | the bot's own membership changing                         |
| `updates.chatMember(o?)`                | `chat_member`         | another member's status changing                          |
| `updates.chatJoinRequest(o?)`           | `chat_join_request`   | a request to join a chat needing approval                 |
| `updates.preCheckoutQuery(payload, o?)` | `pre_checkout_query`  | a pre-checkout query to answer                            |
| `updates.shippingQuery(payload, o?)`    | `shipping_query`      | a shipping query for a flexible invoice                   |
| `updates.poll(question, o?)`            | `poll`                | a poll state update                                       |
| `updates.pollAnswer(optionIds, o?)`     | `poll_answer`         | a user's answer in a non-anonymous poll                   |
| `updates.messageReaction(emoji, o?)`    | `message_reaction`    | a reaction added to a message                             |

Each builder takes a final `UpdateOverrides` (`o`) to change just the parts that
matter. Top-level keys replace the defaults, so pass a whole nested object to
override a nested default wholesale:

```ts
await bot.dispatch(
  updates.command('start', undefined, {
    from: { first_name: 'Bob', id: 42 }, // merged over the default test user
    chat: { id: -1001, type: 'supergroup' }, // merged over the default private chat
  }),
);
```

| Override    | Overrides                                                  |
| ----------- | ---------------------------------------------------------- |
| `updateId`  | the synthetic `update_id` (defaults to auto-incrementing)  |
| `from`      | the sender — merged over the default test user             |
| `chat`      | the chat — merged over the default private chat            |
| `messageId` | the `message_id` of the synthetic message                  |
| `date`      | the Unix `date` of the synthetic message                   |

### The `raw` escape hatch

For any update without a dedicated builder, hand-build the partial and let `raw`
fill in `update_id` (auto-incrementing) when absent:

```ts
await bot.dispatch(
  updates.raw({
    poll_answer: {
      poll_id: 'hand_built',
      option_ids: [0],
      option_persistent_ids: ['opt_0'],
    },
  }),
);
```

:::note
Need an isolated `update_id` counter for one test? Instantiate your own
`new UpdateFactory()` — the shared `updates` singleton is just one instance, and
its counter is per-instance.
:::

## Asserting what the bot sent

Every captured call lands on `sent` in send order. Each is a `SentCall` —
`{ method, payload }` — where `payload` is the **final** request after every
built-in interceptor (default `parse_mode`, rich messages, …) has run, so it's
exactly what would have gone on the wire:

```ts
await bot.dispatch(updates.command('start'));

expect(bot.sent).toHaveLength(1);
expect(bot.sent[0]).toMatchObject({
  method: 'sendMessage',
  payload: { text: 'Hi Test' },
});
```

Three accessors cover the common assertions:

- **`lastMessage`** — the payload of the most recent `sendMessage`, typed as the
  generated `sendMessage` options so `.text` / `.parse_mode` / `.reply_markup`
  autocomplete. The "what did the bot reply?" one-liner.
- **`lastCall`** — the most recent captured call of any method (`{ method, payload }`).
- **`calls(key)`** — every captured call for one method, in order. Key it by the
  **command class** (`bot.calls(SendMessage)`, preferred — no magic string and the
  payload is typed via `OptionsOf<C>`) or the bare method name
  (`bot.calls('sendMessage')`, the escape hatch).

```ts
import { SendMessage } from 'nestgram';

await bot.dispatch(updates.command('start'));
await bot.dispatch(updates.message('again'));

expect(bot.calls(SendMessage)).toHaveLength(2);
expect(bot.calls(SendMessage)[0].payload.text).toBe('Hi Test');
```

`reset()` forgets all captured calls and the last error (registered `onApi` stubs
stay) — handy between cases that share one testbed.

## Stubbing API results

When a handler **reads back** a send result — `const sent = await message.answer('hi');`
then uses `sent.message_id` — stub the raw Telegram response with `onApi`. Return
the raw Telegram shape; the harness runs the method's own `wrap()` over it, so the
handler still receives a rich `Message` / `User` / …:

```ts
import { SendMessage } from 'nestgram';

bot.onApi(SendMessage, () => ({
  message_id: 999,
  date: 1,
  chat: { id: 1, type: 'private' },
  text: 'stubbed',
}));

await bot.dispatch(updates.message('hi'));
```

The responder receives the captured `ApiRequest` and may be sync or async — branch
on the payload to return different results per call. Key it by the command class
(preferred) or the bare method name. `getMe` already returns a default identity
without a stub; any other un-stubbed method returns `{}`, enough for `wrap()` to
build a sparse rich result.

## Testing guards & errors

The real `UpdateDispatcher` swallows handler errors — it logs and moves on, so one
bad update can't kill polling — and `dispatch()` keeps that fidelity by routing
through a global `CaptureErrorFilter` (`APP_FILTER`) that records the error to the
shared `ApiCaptureStore` and re-throws, leaving production control flow unchanged.
The error is then observable on `lastError`:

```ts
await bot.dispatch(updates.command('boom')); // resolves, doesn't throw

expect(bot.lastError).toBeInstanceOf(Error);
expect((bot.lastError as Error).message).toBe('handler exploded');
```

For an assertion-style test, pass `{ rethrow: true }` to re-throw the captured
error so `rejects` works:

```ts
await expect(
  bot.dispatch(updates.command('boom'), { rethrow: true }),
).rejects.toThrow('handler exploded');
```

A **guard denial** surfaces the same way. Nest guards reject by throwing
`ForbiddenException`, so a blocked handler is distinguishable from a clean no-match
— `lastError` holds the exception in the first case, `undefined` in the second:

:::code[secret.router.spec.ts]

```ts
import { ForbiddenException } from '@nestjs/common';
import { NestgramTestbed, updates } from 'nestgram/testing';
import { SecretRouter } from './secret.router';

it('blocks a guarded command', async () => {
  const bot = await NestgramTestbed.create({ routers: [SecretRouter] });

  await bot.dispatch(updates.command('secret')); // @UseGuards(DenyGuard)

  expect(bot.sent).toHaveLength(0);
  expect(bot.lastError).toBeInstanceOf(ForbiddenException);
  await bot.close();
});
```

:::

:::guardrail[only in Nestgram]
This is the same pipeline production runs, not a stand-in. The guard, the filter,
the interceptors — your real classes, resolved through DI and run via
`ExternalContextCreator`. A test that passes here passes because the engine
genuinely routed and executed the update, the way polling would.
:::

## Notes & limits

- **Captures are one flat list.** All sends collapse into a single `sent` list
  regardless of which bot produced them — multi-bot setups aren't partitioned per
  token. For a multi-bot scenario, test one bot's routers per testbed.
- **Errors clear per dispatch.** Each `dispatch()` resets `lastError` first, so it
  always reflects the most recent update — a clean dispatch leaves it `undefined`.
- **The wire is the only fake.** Sessions, i18n, FSM, the throttler, keyboard
  state, your own interceptors — everything above the HTTP boundary is real. If a
  behaviour depends on a module, import it (or your `AppModule`) so it's wired up
  the same as in production.
