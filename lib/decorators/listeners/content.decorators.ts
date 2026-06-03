import {
  ContentTypePredicate,
  MessageContentField,
  RoutePredicate,
} from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const MESSAGE = 'message';

/** Media fields covered by the `@OnMedia()` union. */
const MEDIA_FIELDS: readonly MessageContentField[] = [
  'photo',
  'video',
  'animation',
  'audio',
  'voice',
  'document',
  'video_note',
];

/**
 * Build a `@OnMessage`-scoped listener that fires only when the message carries
 * one of `fields`. This is the single factory behind every content-type
 * decorator below; each is `@OnMessage` plus a {@link ContentTypePredicate}, the
 * same way `@Command`/`@Hears` are `@OnMessage` plus their predicate.
 */
function contentListener(
  ...fields: MessageContentField[]
): (...predicates: RoutePredicate[]) => MethodDecorator {
  return (...predicates: RoutePredicate[]) =>
    createListenerDecorator(
      MESSAGE,
      new ContentTypePredicate(fields),
      ...predicates,
    );
}

/** Plain text message (`text`; never a media caption — the two are exclusive). */
export const OnText = contentListener('text');
/** Media caption (`caption`). */
export const OnCaption = contentListener('caption');
/** Either `text` or a media `caption`. */
export const OnTextOrCaption = contentListener('text', 'caption');

export const OnPhoto = contentListener('photo');
export const OnVideo = contentListener('video');
export const OnAnimation = contentListener('animation');
export const OnAudio = contentListener('audio');
export const OnVoice = contentListener('voice');
export const OnDocument = contentListener('document');
export const OnVideoNote = contentListener('video_note');
export const OnSticker = contentListener('sticker');
export const OnDice = contentListener('dice');
export const OnLocation = contentListener('location');
export const OnContact = contentListener('contact');
export const OnVenue = contentListener('venue');
// Note: no `@OnPoll` here — that name is the top-level `poll` update (poll-state
// changes). A message that *contains* a poll is matchable via `message.poll`.

/** Any downloadable media: photo, video, animation, audio, voice, document, video note. */
export const OnMedia = contentListener(...MEDIA_FIELDS);
