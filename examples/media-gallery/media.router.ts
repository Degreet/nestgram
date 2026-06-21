import {
  Router,
  Command,
  Action,
  OnMessage,
  Message,
  InputFile,
  InlineKeyboard,
  MediaGroup,
  EditMessageMedia,
} from 'nestgram';

/**
 * A tour of the media surface — typed `InputFile` sources, per-kind send sugar,
 * an album builder, editing media in place, and message reactions.
 *
 * Every file here is a remote URL Telegram fetches itself, so the demo needs no
 * local assets. Try `/photo`, `/album`, `/doc`, then send any plain text.
 */
@Router()
export class MediaRouter {
  private static readonly PHOTO_A =
    'https://picsum.photos/seed/nestgram-a/600/400';
  private static readonly PHOTO_B =
    'https://picsum.photos/seed/nestgram-b/600/400';
  private static readonly CLIP = 'https://www.w3schools.com/html/mov_bbb.mp4';

  /** Send a photo by URL (remote = just a string) with a caption and a Swap button. */
  @Command('photo')
  photo(message: Message) {
    return message.answerPhoto(MediaRouter.PHOTO_A, {
      caption: 'A remote photo — tap Swap to edit it in place.',
      reply_markup: new InlineKeyboard().text('Swap', 'swap'),
    });
  }

  /**
   * Swap returns an *untargeted* edit command: the framework fills
   * chat_id/message_id from the callback message and edits it in place.
   */
  @Action('swap')
  swap() {
    return new EditMessageMedia({
      media: { type: 'photo', media: MediaRouter.PHOTO_B },
    });
  }

  /** A mixed photo + video album, assembled with the fluent builder. */
  @Command('album')
  album(message: Message) {
    const album = new MediaGroup()
      .photo(MediaRouter.PHOTO_A, { caption: 'First' })
      .photo(MediaRouter.PHOTO_B)
      .video(MediaRouter.CLIP);

    return message.answerMediaGroup(album);
  }

  /** Upload raw bytes as a document — a Buffer needs an explicit filename. */
  @Command('doc')
  doc(message: Message) {
    const notes = Buffer.from('Generated on the fly.\n', 'utf-8');
    return message.answerDocument(
      new InputFile(notes, { filename: 'notes.txt' }),
    );
  }

  /** Any other text message gets a 👍 — the reaction sugar. */
  @OnMessage()
  thumbsUp(message: Message) {
    return message.react('👍');
  }
}
