import { callbackData } from 'nestgram';

/**
 * Typed callback data — one definition each for the "done" and "delete" buttons.
 * `.pack({ id })` builds the button value, `.filter()` matches the action, and
 * `@Data()` decodes it back to `{ id: number }`. No magic `done:42` strings.
 */
export const DoneCb = callbackData('done', { id: Number });
export const DeleteCb = callbackData('del', { id: Number });
