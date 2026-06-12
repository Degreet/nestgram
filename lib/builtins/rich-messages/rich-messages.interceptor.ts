import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Observable } from 'rxjs';

import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../../api/request';
import type { RawInputRichMessage } from '../../events/raw-update.types';
import {
  RICH_MESSAGES_SETTINGS,
  RichMessageDialect,
  RichMessagesSettings,
} from './rich-messages.types';

/**
 * Rewrites plain `sendMessage` calls into `sendRichMessage`, treating the
 * outgoing text as the configured rich dialect (Bot API 10.1). String returns
 * and `message.answer()`/`reply()` all funnel through `sendMessage`, so one
 * rewrite covers them. Implemented as an ordinary {@link ApiInterceptor} — no
 * privileged core; a user could write the same hook.
 *
 * Opt-in: without `RichMessagesModule.forRoot` the settings token resolves to
 * nothing and the interceptor is a passthrough. A call that states its own
 * formatting intent (`parse_mode`, `entities`) or asks for an option the rich
 * path can't honor (`link_preview_options`) is left untouched — which is why
 * this runs BEFORE the default parse-mode injector (an injected default must
 * not read as explicit intent).
 */
@Injectable()
export class RichMessagesInterceptor implements ApiInterceptor {
  private static readonly SOURCE_METHOD = 'sendMessage';
  private static readonly TARGET_METHOD = 'sendRichMessage';
  private static readonly INCOMPATIBLE_FIELDS = [
    'parse_mode',
    'entities',
    'link_preview_options',
  ] as const;
  /**
   * Constructs only the rich renderer supports — what `mode: 'dynamic'` looks
   * for: markdown headings / table rows / dividers, HTML heading / table /
   * details / hr tags. Plain bold/italic/links render fine via `parse_mode`,
   * so they alone don't trigger the rewrite.
   */
  private static readonly RICH_ONLY_SYNTAX: Readonly<
    Record<RichMessageDialect, RegExp>
  > = {
    // A table row needs ≥2 cells — a lone `|wrapped|` line (e.g. a MarkdownV2
    // spoiler `||text||`) is not a table and must not trigger the rewrite.
    markdown: /^#{1,6}\s\S|^\|(?:[^|\n]+\|){2,}\s*$|^(?:-{3,}|\*{3,})\s*$/m,
    html: /<(?:h[1-6]|table|details|hr)\b/i,
  };

  constructor(
    @Optional()
    @Inject(RICH_MESSAGES_SETTINGS)
    private readonly settings: RichMessagesSettings | null,
  ) {}

  intercept(
    context: ApiExecutionContext,
    next: ApiCallHandler,
  ): Observable<unknown> {
    if (!this.settings) {
      return next.handle();
    }
    const request = context.getRequest();
    if (request.method !== RichMessagesInterceptor.SOURCE_METHOD) {
      return next.handle();
    }
    const { text, ...rest } = request.payload;
    if (typeof text !== 'string') {
      return next.handle();
    }
    if (
      RichMessagesInterceptor.INCOMPATIBLE_FIELDS.some(
        (field) => field in request.payload,
      )
    ) {
      return next.handle();
    }
    if (
      this.settings.mode === 'dynamic' &&
      !RichMessagesInterceptor.RICH_ONLY_SYNTAX[this.settings.dialect].test(
        text,
      )
    ) {
      return next.handle();
    }

    const richMessage: RawInputRichMessage =
      this.settings.dialect === 'html' ? { html: text } : { markdown: text };
    request.method = RichMessagesInterceptor.TARGET_METHOD;
    request.payload = { ...rest, rich_message: richMessage };
    return next.handle();
  }
}
