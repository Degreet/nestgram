import { ApiMethod } from './api-method';
import type { RawSticker } from '../../events/raw-update.types';

export class GetForumTopicIconStickers extends ApiMethod<null, RawSticker[]> {
  readonly method = 'getForumTopicIconStickers';

  readonly throttled = false;

  constructor() {
    super(null);
  }
}
