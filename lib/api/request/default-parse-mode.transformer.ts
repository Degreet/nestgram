import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiRequest, RequestTransformer } from './request.types';
import { Providers } from '../../providers';

/** Module options this transformer reads (only the configured default mode). */
interface ParseModeOptions {
  parseMode?: string;
}

/**
 * Applies the configured default `parse_mode` to sends that format text, when
 * the call didn't set one. This is the "default parse mode" feature implemented
 * as an ordinary {@link RequestTransformer} — no privileged core; a user could
 * write the same hook.
 *
 * It only touches requests whose payload carries `text` or `caption` (the
 * fields `parse_mode` formats), so non-text methods are left alone without a
 * maintained method list. `entities`/`caption_entities` are Telegram's
 * alternative to `parse_mode`: when present the default is not injected (it
 * can't shadow them), and supplying both an explicit `parse_mode` and entities
 * is warned about (Telegram ignores `parse_mode` in that case).
 */
@Injectable()
export class DefaultParseModeTransformer implements RequestTransformer {
  private readonly logger = new Logger(DefaultParseModeTransformer.name);
  private readonly defaultParseMode?: string;

  constructor(@Inject(Providers.BOT_OPTIONS) options: ParseModeOptions) {
    this.defaultParseMode = options.parseMode;
  }

  transform(request: ApiRequest): void {
    const payload = request.payload;
    const formattable = 'text' in payload || 'caption' in payload;
    if (!formattable) {
      return;
    }

    const hasEntities = 'entities' in payload || 'caption_entities' in payload;
    const hasParseMode = 'parse_mode' in payload;

    if (hasEntities && hasParseMode) {
      this.logger.warn(
        'A send was given both parse_mode and entities; Telegram ignores ' +
          'parse_mode and uses the entities. Pass only one.',
      );
    }

    if (this.defaultParseMode && !hasParseMode && !hasEntities) {
      payload.parse_mode = this.defaultParseMode;
    }
  }
}
