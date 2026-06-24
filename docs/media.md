---
title: Sending media
description: Send photos, videos, documents and albums, edit media in place, react to messages, and reuse uploads through the file_id cache.
sidebar:
  label: Media
  group: Events & replies
  order: 35
---

Text is one reply; files are the other half. Every media kind goes out through
the same `answer*` / `reply*` sugar on `Message` you already use for text, and a
returned send command travels the same return-value contract as a returned
string.

:::mental
remote file -> a bare string ; local file -> new InputFile() -> answer\* / MediaGroup
:::

## Files: a string or an `InputFile`

A media field is `string | InputFile`. The split tracks how the bytes reach
Telegram:

- **Remote — a bare string.** A URL or a `file_id` goes out as-is and Telegram
  resolves it. Nothing to wrap.
- **Local — `new InputFile(...)`.** Local bytes have to be read and uploaded as
  `multipart/form-data`, so they're wrapped. The constructor is overloaded over
  a path, a stream, or a buffer.

| Source     | How                                            |
| ---------- | ---------------------------------------------- |
| Remote URL | `'https://example.com/cat.jpg'`                |
| `file_id`  | `'AgACAgIAAx…'`                                |
| Local path | `new InputFile('./cat.jpg')`                   |
| Stream     | `new InputFile(createReadStream('./cat.jpg'))` |
| Buffer     | `new InputFile(bytes, { filename: 'c.jpg' })`  |

For an upload, the file name and MIME type are inferred from the path (override
with `{ filename, contentType }`). To reuse a `file_id` after the first upload,
reach for [`CachedFile`](#reusing-uploads-the-file-id-cache) instead.

:::note
A buffer has no name to infer from, so `filename` is required — and the
overload's type enforces it, so the compiler reminds you. Telegram names the
file from it and derives the MIME type.

:::

## Sending media

Every media kind has an `answer*` (send to the same chat) and a `reply*` (quote
the incoming message) method on `Message`, mirroring `answer` / `reply` for
text. Each takes the file as `string | InputFile` plus the Bot API method's
options:

| Method       | Sends                | Underlying command class |
| ------------ | -------------------- | ------------------------ |
| `Photo`      | a photo              | `SendPhoto`              |
| `Video`      | a video              | `SendVideo`              |
| `Audio`      | an audio track       | `SendAudio`              |
| `Document`   | any file             | `SendDocument`           |
| `Voice`      | a voice message      | `SendVoice`              |
| `Animation`  | a GIF / silent video | `SendAnimation`          |
| `VideoNote`  | a round video note   | `SendVideoNote`          |
| `Sticker`    | a sticker            | `SendSticker`            |
| `MediaGroup` | an album (see below) | `SendMediaGroup`         |

Each row is the suffix on both `answer*` and `reply*` — `answerPhoto` /
`replyPhoto`, `answerDocument` / `replyDocument`, and so on.

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

The command classes in the right-hand column are the layer beneath the sugar —
`message.answerPhoto(...)` assembles a `SendPhoto`. Return one yourself when you
want to set `chat_id` explicitly, and the return-value contract executes it just
like the sugar's promise.

## Albums

An album — Telegram's _media group_ — is built with the fluent **`MediaGroup`**
builder, the same accumulate-then-hand-over shape as the keyboard builder. Each
verb tags the item's `type` for you, so there's no `type:` field to write:

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

The builder carries four item verbs plus two accumulators for dynamic albums:

| Method                       | What it does                                     |
| ---------------------------- | ------------------------------------------------ |
| `.photo(media, options?)`    | append a photo item                              |
| `.video(media, options?)`    | append a video item                              |
| `.audio(media, options?)`    | append an audio item                             |
| `.document(media, options?)` | append a document item                           |
| `.add(...items)`             | append already-built `InputMedia*` items         |
| `.each(items, build)`        | append one item per source value (e.g. a DB row) |

`.each` takes the source array and a `(group, item, index) => void` callback —
call a verb on `group` per item:

```ts
const album = new MediaGroup().each(rows, (group, row) =>
  group.photo(row.url, { caption: row.title }),
);
```

`answerMediaGroup` / `replyMediaGroup` also accept a plain `AlbumItem[]`, so
`MediaGroup` is purely ergonomic — `toJSON()` makes it accepted anywhere the raw
array is. Telegram only allows mixing **photos and videos** in one album;
audio-only and document-only albums are valid too.

## Editing media in place

`message.editMedia(...)` swaps the media of an existing message — the
counterpart to `editText` / `editReplyMarkup`. It takes the `InputMedia`
descriptor positionally:

```ts
await message.editMedia({ type: 'photo', media: nextPhotoUrl });
```

Inside a callback you can also **return** an untargeted `EditMessageMedia`. The
return-value contract recognizes it as an edit-in-place command and fills
`chat_id` / `message_id` from the callback message — the same auto-targeting that
applies to a returned `EditMessageText` or a bare `InlineKeyboard`:

:::code[media.router.ts]{mark="7-9"}

```ts
import { Router, Action, EditMessageMedia } from 'nestgram';

@Router()
export class MediaRouter {
  @Action('swap')
  swap() {
    return new EditMessageMedia({
      media: { type: 'photo', media: 'https://picsum.photos/id/20/600/400' },
    });
  }
}
```

:::

:::note
`editMessageMedia` only works when the target is already a media message —
Telegram won't turn a text message into a photo. If the bot's own message has
aged out or been deleted, the `ResultHandler` warns instead of throwing: the
call was its auto-targeting, not your explicit one. (An `editMedia` you call
directly with a real target propagates the error normally.)

:::

## Reactions

`message.react(emoji)` sets a single emoji reaction on the message — replacing
any existing one — over `setMessageReaction`:

```ts
import { Router, OnMessage, Message } from 'nestgram';

@Router()
export class ReactRouter {
  @OnMessage()
  thumbsUp(message: Message) {
    return message.react('👍');
  }
}
```

Pass `setMessageReaction` options as the second argument — for example
`{ is_big: true }` for the large animation.

## Reusing uploads: the file_id cache

Re-sending the same static file re-uploads its bytes every time. The file_id
cache fixes that: the first send uploads as usual, the returned `file_id` is
remembered, and later sends of the same source go out as that `file_id` — no
bytes re-uploaded, no URL re-fetched.

It's **opt-in per file**: send a `new CachedFile(path)` instead of a
`new InputFile(path)`. There's no global switch — a plain `InputFile` is never
cached, so a user-uploaded photo can't land in the cache by accident:

```ts
import { CachedFile, InputFile } from 'nestgram';

// Cached after the first send — same bytes reused from then on:
message.answerPhoto(new CachedFile('./assets/logo.png'));

// A plain upload → fresh every time (the safe default):
message.answerPhoto(new InputFile(userUploadedPath));
```

The mover is `FileIdCacheInterceptor`, an ordinary api-pipeline interceptor (no
privileged core) sitting just before the throttler — so a cache hit that turns
an upload into a `file_id` send still rate-limits. It acts only on the single
primary file of a send (`answerPhoto`, `answerVideo`, `answerDocument`, …),
keyed by path and scoped per bot. `CachedFile` is path-only — a path is the one
source with a stable identity to key on; album items and secondary files
(`thumbnail` / `cover`, whose `file_id` Telegram doesn't echo) are never cached.

The `fileIdCache` module option only configures the cache's backing — you reach
for it to swap the default in-memory store for Redis (any `KeyValueStore`:
`{ get, set, delete }`), bound it with a `ttl`, or fold a content hash into the
`key`:

:::code[app.module.ts]

```ts
import { NestgramModule } from 'nestgram';

NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: true,
  fileIdCache: {
    store: new MyRedisStore(redis), // any { get, set, delete }
    ttl: 24 * 60 * 60 * 1000, // ms
  },
});
```

:::

:::caution
The key is the path, so a changed file at the same path keeps serving the old
`file_id`. For a static asset that's the point; for one that may change, set a
`ttl` or fold a content hash into the `key`. And only wrap **trusted** paths in
`CachedFile` — a user-controlled path on the unbounded in-memory store mints a
permanent entry per distinct path, defeating the safe default.

:::

See the full runnable tour in
[`examples/media-gallery`](https://github.com/Degreet/nestgram/tree/main/examples/media-gallery).
