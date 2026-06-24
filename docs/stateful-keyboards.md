---
title: Stateful keyboards
description: Checkbox and radio groups, pagination, and reset/select-all actions — keyboards that re-derive from per-message state on every tap, with no toggle or nav handler of your own.
sidebar:
  group: Keyboards
  order: 51
---

The [base builder](/docs/keyboards) lays out static buttons. This page is about
keyboards that **change as the user taps them** — a multi-select picker, a radio,
a paged list. The mental shift is small but load-bearing:

:::mental
the keyboard is a projection of per-message state, re-derived on every tap
:::

You don't mutate markup. You render the keyboard from state, the framework
applies the tap to that state, and then it re-runs your render to get the next
keyboard and edits the message in place. One render method, fed by state — like a
component re-rendering from a store, not a DOM you patch by hand.

The split that makes it work, and the line to remember:

:::tip
The store holds the **invisible** selection; `callback_data` carries the
**visible** cursor.
:::

A checkbox group's picks are invisible state, so they live in a store. A page
number is encoded right in the nav button's `callback_data`, so it rides the
message and survives a restart with no store at all. Keep that division in mind
and the rest follows.

## The single render method

Every stateful keyboard hangs off one method marked `@KeyboardRender(id)`. You
call it to show the keyboard; the framework calls the **same** method to
re-render after a tap. Because it re-runs inside the update's ambient scope, it
re-reads state and re-derives its data each time — so the whole keyboard reflects
the latest state, not just the group that was tapped.

:::code[topics.router.ts]

```ts
import {
  Router,
  Command,
  KeyboardRender,
  OnCheckboxDone,
  CheckboxIds,
  Message,
  InlineKeyboard,
} from 'nestgram';

const TOPICS = [
  { id: 'news', name: 'News' },
  { id: 'sales', name: 'Sales' },
  { id: 'tips', name: 'Tips' },
];

@Router()
export class TopicsRouter {
  @Command('topics')
  open(message: Message) {
    return message.answer('Pick what to hear about:', {
      reply_markup: this.menu(),
    });
  }

  @KeyboardRender('topics')
  menu() {
    return new InlineKeyboard().checkboxes('topics', (cb) =>
      cb
        .map(TOPICS, (t) => cb.toggle(t.name, t.id))
        .split(1)
        .row(cb.done('✓ Done')),
    );
  }

  @OnCheckboxDone('topics')
  save(@CheckboxIds('topics') topics: string[]) {
    return `Saved ${topics.join(', ')} ✅`;
  }
}
```

:::

That's the whole flow — `open` mounts it, the render method is the source of
truth, `save` reads the result. No toggle handler, no nav handler. The mover is
`@KeyboardRender`: it registers `menu()` against the `topics` group at boot, so a
tap on any of that group's buttons re-invokes it and edits the message.

:::caution
`@KeyboardRender` is discovered at boot, which is why re-rendering survives a
restart. A keyboard thrown **inline** from a handler (built ad hoc, not behind a
render method) still toggles for the life of the process, but its registration is
gone after a restart — the selection in the store survives, the user just
re-opens. Prefer a render method for anything you want durable. It may be
`async` to pull data from a service.
:::

## Checkboxes and radio groups

`.checkboxes(id, build, config?)` carves out a multi-select group. Inside `build`
you have the full keyboard sugar plus one extra verb, `cb.toggle` — a button
**auto-marked** from whether its item is currently selected, so you never compute
the ✅ yourself.

`.radio(id, build, config?)` is the single-select sibling — exactly
`.checkboxes(id, build, { multi: false })`, with `🔘`/`⚪` glyphs. Re-tapping the
picked option clears it.

| Verb               | Renders                                                            |
| ------------------ | ----------------------------------------------------------------- |
| `cb.toggle(label, item, opts?)` | a checkbox button, auto-marked from the group's selection |
| `cb.done(label)`   | a Done button — routes to the `@OnCheckboxDone(id)` handler        |
| `cb.clear(label)`  | a built-in Reset — clears the group's selection and re-renders     |

`cb.toggle`'s `opts` overrides one button: `{ active: true }` forces the marker,
`{ markers: { on: '◉', off: '○' } }` swaps the glyphs for that button alone.

### Reading the result

`@OnCheckboxDone(id)` handles the Done tap; it's plain sugar over
`@Action('checkbox/<id>/done')`, so the handler runs the full pipeline — guards,
DI, `@Session()`. `@CheckboxIds(id)` hands you the current picks as `string[]`:

:::code[notify.router.ts]

```ts
import { Router, OnCheckboxDone, CheckboxIds, Session } from 'nestgram';

interface Prefs {
  topics: string[];
}

@Router()
export class NotifyRouter {
  @OnCheckboxDone('topics')
  save(@CheckboxIds('topics') topics: string[], @Session() prefs: Prefs) {
    prefs.topics = topics;
    return `Saved ${topics.join(', ')} ✅`;
  }
}
```

:::

Returning a `string` answers the tap as a brief **toast** (a quick ack). To leave
a durable summary in the chat instead, take the `CallbackQuery` as the first arg
and `return query.message?.answer(...)`.

### Where the selection lives

The selection sits in **per-message keyboard state**, under a `checkbox:<id>`
field — auto-wired, no import. The key is the message itself
(`kbd:c<chat>:m<message>`), so two open pickers — even in the same chat — keep
independent state, and the visible ticks on a shared group keyboard are correctly
shared because Telegram renders one markup per message.

That store reuses your [session](/docs/sessions) backend when sessions are on, so
a Redis session setup makes keyboards highload-safe across servers for free;
otherwise it falls back to an in-process store.

A few config knobs:

| Config       | Effect                                                                 |
| ------------ | --------------------------------------------------------------------- |
| `multi`      | `false` makes it a radio (or just use `.radio(...)`)                   |
| `default`    | ids to pre-tick on the **first** render, before any tap                |
| `selected`   | a custom reader: return the current ids on every render               |
| `onChange`   | a writer for the whole set (mutually exclusive with `onToggle`)        |
| `onToggle`   | a writer for a per-item delta (`id` is now `on`)                       |
| `scope`      | partition the selection by a dependency (see linked groups)            |

:::note
`default` seeds **only** the built-in store, and only until the first tap — once a
selection is persisted it wins, because an empty selection is a real choice, not
"seed me again". If you supply `selected`, you own the read entirely and `default`
is ignored.
:::

To keep the selection somewhere other than keyboard state, pass `selected`
**together with** a writer (`onChange` or `onToggle`). The pair is required and
enforced in the constructor: `selected` is read on every render, so keep it sync
and cheap (an already-loaded object, FSM data on the rail — never a live DB call),
and the writer persists each change. A writer with no `selected` throws — the
group would have nowhere to read the set back from.

## Pagination — the cursor in callback_data

A long list doesn't fit one screen. `.paginate(id, { size })` keeps only the
current page of the section above it and appends a `‹ 2/5 ›` nav row — and **you
write no nav handler**. The render method owns the rest:

:::code[shop.router.ts]

```ts
import {
  Router,
  Command,
  KeyboardRender,
  Message,
  InlineKeyboard,
  Button,
} from 'nestgram';

@Router()
export class ShopRouter {
  constructor(private readonly products: ProductService) {}

  @Command('shop')
  open(message: Message) {
    return message.answer('Our products:', { reply_markup: this.menu() });
  }

  @KeyboardRender('shop')
  menu() {
    return new InlineKeyboard()
      .map(this.products.all(), (p) => Button.text(p.name, `buy/${p.id}`))
      .split(2)
      .paginate('shop', { size: 8 });
  }
}
```

:::

Here's the principle in code. The framework owns the `pagego/<id>/…` nav route
and reads the **current page back from the nav button's own `callback_data`** — so
the cursor lives in the message, not a store, and survives a restart. `size` caps
buttons per page; rows stay whole, so a `.split(2)` grid paginates by pairs. A
single page renders no controls. `prev`/`next` override the `‹`/`›` labels.

Pagination needs `@KeyboardRender` to be navigable — a tap re-renders by
rebuilding the page. An inline keyboard thrown straight from a handler can't
change page, because there's no render method to re-invoke.

**Two lists, independently:** call `.paginate()` once per section — each scrolls
on its own, and paging one keeps the other's page. Rows added *after* a
`.paginate()` call form the next section, so a trailing Done/Back button stays off
the paged region:

:::code[catalog.router.ts]

```ts
import { KeyboardRender, InlineKeyboard, Button } from 'nestgram';

@KeyboardRender('cats', 'tags')
menu() {
  return new InlineKeyboard()
    .map(this.cats.all(), (c) => Button.text(c.name, `cat/${c.id}`))
    .split(2)
    .paginate('cats', { size: 8 })
    .map(this.tags.all(), (t) => Button.text(t.name, `tag/${t.id}`))
    .split(2)
    .paginate('tags', { size: 8 });
}
```

:::

## Linked groups — a category drives its tags

Several groups can share one keyboard, each with its own id, and a render method
can read one group's pick to drive another with `selectedIds(id)` — the free
function that reads a group's selection off the rail (the same idea as `t()` for
i18n: an imported function, not an injected service). The classic case: a category
radio decides which tags render.

:::code[picker.router.ts]

```ts
import {
  Router,
  Command,
  KeyboardRender,
  OnCheckboxDone,
  CheckboxIds,
  Message,
  InlineKeyboard,
  selectedIds,
} from 'nestgram';

const CATS = [
  { id: 'fruit', name: 'Fruit' },
  { id: 'veg', name: 'Veg' },
];

@Router()
export class PickerRouter {
  constructor(private readonly tags: TagService) {}

  @Command('pick')
  open(message: Message) {
    return message.answer('Choose a category:', { reply_markup: this.menu() });
  }

  @KeyboardRender('category', 'tags')
  menu() {
    const [category] = selectedIds('category'); // the chosen category
    const tags = category ? this.tags.byCategory(category) : [];
    return new InlineKeyboard()
      .radio('category', (cb) =>
        cb
          .map(CATS, (c) => cb.toggle(c.name, c.id))
          .split(2)
          .paginate('category', { size: 8 }),
      )
      .checkboxes(
        'tags',
        (cb) =>
          cb
            .map(tags, (t) => cb.toggle(t.name, t.id))
            .split(2)
            .paginate('tags', { size: 8 }),
        { scope: () => selectedIds('category')[0] },
      );
  }

  @OnCheckboxDone('tags')
  save(@CheckboxIds('tags') tags: string[]) {
    return `Picked ${tags.join(', ')} ✅`;
  }
}
```

:::

Tapping a category re-renders with that category's tags — the render method
re-derives from the just-applied state. The pieces that make this hold up:

:::anno

1. `selectedIds('category')` reads the radio's pick off the rail at render time,
   so the tag list is computed fresh from whatever was last chosen.
2. `scope` keys the **tags group's selection** by the category
   (`checkbox:tags:<category>`), so each category remembers its own tag picks —
   switching never mixes them, and switching back restores them.
3. `scope` re-reads the rail (`() => selectedIds('category')[0]`), **not** the
   destructured `category`. It must: a callback can run later against a keyboard
   built earlier (on Done, or a custom action), where a captured `category` would
   be stale.
4. `@CheckboxIds('tags')` on Done reads the **current** category's set, because it
   resolves through the group's binding, which honours the scope.

:::

`.paginate(id)` inside a group's build scrolls only the rows above it; a checkbox
tap keeps the page it's on, because the page cursor lives in the keyboard's
`callback_data`. Rows added after `.paginate` form a non-scrolling section, so a
trailing Done/Reset row stays pinned on every page. The result is a single
declarative builder: two scrollable, linked, scoped lists, with no nav or toggle
handlers of your own.

## Actions — Reset, and your own

`cb.clear(label)` is the one built-in action — a **Reset** that clears the group's
selection (the current scope's, if scoped) and re-renders, no handler:

```ts
.row(cb.clear('♻ Reset'), cb.done('✓ Done'))
```

Anything beyond that is just a normal `@Action`. You mutate the selection through
the rail and `return this.menu()` to re-render — the same "return a keyboard →
edit in place" contract. Select-all is yours, since you hold the dataset:

:::code[picker.router.ts]

```ts
import { Router, Action, KeyboardRender, InlineKeyboard, Button, selectedIds, setSelectedIds } from 'nestgram';

@Router()
export class PickerRouter {
  constructor(private readonly tags: TagService) {}

  @KeyboardRender('category', 'tags')
  menu() {
    const [category] = selectedIds('category');
    const tags = category ? this.tags.byCategory(category) : [];
    return new InlineKeyboard()
      .radio('category', (cb) => cb.map(CATS, (c) => cb.toggle(c.name, c.id)))
      .checkboxes(
        'tags',
        (cb) =>
          cb
            .map(tags, (t) => cb.toggle(t.name, t.id))
            .split(2)
            .row(Button.text('Select all', 'tags/all'), cb.clear('Reset'), cb.done('Done')),
        { scope: () => selectedIds('category')[0] },
      );
  }

  @Action('tags/all')
  selectAll() {
    const [category] = selectedIds('category');
    setSelectedIds('tags', this.tags.byCategory(category).map((t) => t.id)); // scope-aware
    return this.menu(); // re-render
  }
}
```

:::

`setSelectedIds` / `clearSelectedIds` are the rail writers; `selectedIds` reads.
Both writers are scope-aware — they go through the group's binding, so they hit
the current scope's key. The mutation runs on the tap, then `this.menu()`
re-projects it. A custom action is a **pure state change**, never a parallel
render path — the render method stays the only place a keyboard is built.

| Rail function              | Does                                                  |
| -------------------------- | ---------------------------------------------------- |
| `selectedIds(id)`          | read a group's current ids (unscoped key)            |
| `setSelectedIds(id, ids)`  | replace a group's selection (scope-aware)            |
| `clearSelectedIds(id)`     | clear a group's selection (scope-aware)              |

:::tip
For full manual control — your own toggle route, custom marking — `Button.toggle`
is the low-level primitive the whole group is built on. Reach for it only when you
genuinely need to own the routing; the group handles the common case with no
handler at all.
:::
