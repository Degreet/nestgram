import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractPayload } from '../../engine/execution';
import {
  DeepLinkData,
  DeepLinkDataDecoder,
  DeepLinkDataSchema,
} from '../../deep-links';

const parseStartPayload = createParamDecorator(
  (definition: DeepLinkDataDecoder, ctx: ExecutionContext) => {
    const payload = extractPayload(TelegramExecutionContext.of(ctx));
    return payload === undefined ? null : definition.parse(payload);
  },
);

/**
 * Parse the command's deep-link payload (the text after `/start`) into the typed
 * values of a {@link deepLinkData} definition — `null` if there is no payload or
 * it isn't this definition's.
 *
 * ```ts
 * const Ref = deepLinkData('ref', { userId: Number });
 *
 * @Command('start')
 * start(@StartPayload(Ref) data: { userId: number } | null) {}
 * ```
 *
 * The same `Ref` packs the link (`bot.deepLink({ start: Ref.pack(...) })`) and
 * decodes it here — no magic string on either end.
 */
export const StartPayload = <S extends DeepLinkDataSchema>(
  definition: DeepLinkData<S>,
): ParameterDecorator => parseStartPayload(definition);
