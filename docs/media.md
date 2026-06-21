---
title: Sending media
description: Send photos, videos, documents and albums with typed InputFile sources, edit media in place, and react to messages.
sidebar:
  label: Media
  group: Events & replies
  order: 35
---

Text is one reply; files are the other half. Nestgram sends every media kind
through the same `message.answer*` / `reply*` sugar you already use for text.

:::mental
local file -> new InputFile() ; remote -> a string -> answer\* / MediaGroup
:::

## Files: a string or an `InputFile`

A media field takes either:

- **A remote file — just a string.** A URL or a `file_id` goes through as-is;
  Telegram resolves it. No wrapper needed.
- **A local file — `new InputFile(...)`.** Local bytes have to be read and
  uploaded as `multipart/form-data`, so they're wrapped. The constructor takes a
  path, a stream, or a buffer:

| Source     | How                                           |
| ---------- | --------------------------------------------- |
| Remote URL | `'https://example.com/cat.jpg'`               |
| `file_id`  | `'AgACAgIAAx…'`                               |
| Local path | `new InputFile('./cat.jpg')`                  |
| Buffer     | `new InputFile(bytes, { filename: 'c.jpg' })` |
| Stream     | `new InputFile(createReadStream('./c.jpg'))`  |

The file name and MIME type are inferred for an upload (override with
`{ filename, contentType }`). To reuse a `file_id` after the first upload, use
[`new CachedFile()`](#reusing-uploads-the-file-id-cache).

:::note
A buffer needs a `filename` — Telegram names the file from it (and derives the
MIME type). It's required by the type, so the compiler reminds you.

:::

## Sending media

Every media kind has an `answer*` (send to the same chat) and a `reply*` (quote
the incoming message) method, mirroring `answer` / `reply` for text:
`answerPhoto`, `answerVideo`, `answerAudio`, `answerDocument`, `answerVoice`,
`answerAnimation`, `answerVideoNote`, `answerSticker`. Each takes the file as a
`string | InputFile` plus the method's options:

:::code[media.router.ts]

```ts
import { Router, Command, Message, InputFile, InlineKeyboard } from 'nestgram';

@Router()
export class MediaRouter {
  @Command('photo')
  photo(message: Message) {
    return message.answerPhoto('https://picsum.photos/600/400', {
      caption: 'A remote photo — tap Swap to edit it in place.',
      reply_markup: new InlineKeyboard().text('Swap', 'swap'),
    });
  }

  @Command('doc')
  doc(message: Message) {
    const notes = Buffer.from('Generated on the fly.\n', 'utf-8');
    return message.answerDocument(
      new InputFile(notes, { filename: 'notes.txt' }),
    );
  }
}
```

:::

The underlying command objects (`new SendPhoto(...)`, `new SendDocument(...)`)
are the layer beneath — return one from a handler if you'd rather assemble the
call yourself.

## Reusing uploads: the file-id cache

Re-sending the same static file re-uploads its bytes every time. The file-id
cache fixes that: the first send uploads as usual, then later sends of the same
source reuse the returned `file_id` — no bytes re-uploaded, no URL re-fetched.

It's **opt-in per file**: send a `new CachedFile(path)` instead of a
`new InputFile(path)` and it's cached (in a process-local store by default).
There's no global switch to flip — a plain `InputFile` is never cached, so a
user-uploaded photo can't land in the cache by accident:

```ts
// Cached after the first send — same bytes reused forever:
message.answerPhoto(new CachedFile('./assets/logo.png'));

// A plain upload → fresh every time (the safe default):
message.answerPhoto(new InputFile(userUploadedPath));
```

That's all it takes. It's an ordinary outbound interceptor (no privileged core)
sitting just before the throttler, so a cache hit still rate-limits. It caches
the single primary file of a send (`answerPhoto`, `answerVideo`,
`answerDocument`, …), keyed by the path and scoped per bot. `CachedFile` is
path-only (a path is the one source with a stable identity), and album items and
thumbnails are never cached.

Pass `fileIdCache` only to swap the default store for Redis (any
`KeyValueStore`), bound it with a `ttl`, or fold a content hash into the `key`:

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: true,
  fileIdCache: {
    store: new MyRedisStore(redis), // any { get, set, delete }
    ttl: 24 * 60 * 60 * 1000, // ms
  },
});
```

:::note
Because the key is the path, a changed file at the same path keeps serving the
old `file_id`. For a static asset that's the point; for something that may
change, set a `ttl` or fold a content hash into the `key`. And only wrap
**trusted** paths in `CachedFile` — caching a user-controlled one defeats the
safe default.

:::

## Albums

An album (Telegram's _media group_) is built with the fluent **`MediaGroup`**
builder, the same shape as the keyboard builder: accumulate items, then hand it
straight to `answerMediaGroup` / `replyMediaGroup`.

:::code[album.router.ts]

```ts
import { Router, Command, Message, MediaGroup } from 'nestgram';

@Router()
export class AlbumRouter {
  @Command('album')
  album(message: Message) {
    const album = new MediaGroup()
      .photo('https://picsum.photos/seed/a/600/400', { caption: 'First' })
      .photo('https://picsum.photos/seed/b/600/400')
      .video('https://example.com/clip.mp4');

    return message.answerMediaGroup(album);
  }
}
```

:::

`.photo()` / `.video()` / `.audio()` / `.document()` each set the item type for
you — no `type:` tag to write. Two more accumulators help with dynamic albums:

- `.add(...items)` — append already-built items.
- `.each(items, (group, item) => group.photo(item.url))` — one item per source
  value, e.g. from a database row.

`answerMediaGroup` also takes a plain item array, so `MediaGroup` is purely
ergonomic. Telegram only allows mixing **photos and videos** in one album;
audio-only and document-only albums are also valid.

## Editing media in place

`editMedia` swaps the media of an existing message — the counterpart to
`editText` / `editReplyMarkup`:

```ts
await message.editMedia({ type: 'photo', media: nextPhotoUrl });
```

Inside a callback you can also **return** an untargeted `EditMessageMedia`: the
engine fills `chat_id`/`message_id` from the callback message and edits it in
place, exactly like a returned `EditMessageText` or a bare keyboard.

:::code[media.router.ts]{mark="7-12"}

```ts
import { Router, Action, EditMessageMedia } from 'nestgram';

@Router()
export class MediaRouter {
  @Action('swap')
  swap() {
    return new EditMessageMedia({
      media: {
        type: 'photo',
        media: 'https://picsum.photos/id/20/600/400',
      },
    });
  }
}
```

:::

:::note
`editMessageMedia` only works when the target is already a media message —
Telegram won't turn a text message into a photo. If the message is too old or
deleted, the framework warns instead of throwing (it was the engine's
auto-targeting, not your explicit call).

:::

## Reactions

`message.react(emoji)` sets a single emoji reaction on the message (replacing
any existing one), wrapping `setMessageReaction`:

```ts
@OnMessage()
thumbsUp(message: Message) {
  return message.react('👍');
}
```

Pass `setMessageReaction` options as the second argument — for example
`{ is_big: true }` for the large animation.

See the full runnable tour in
[`examples/media-gallery`](https://github.com/Degreet/nestgram/tree/main/examples/media-gallery).
