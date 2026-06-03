import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  ApiRequest,
  REQUEST_TRANSFORMERS,
  RequestTransformer,
} from './request.types';

/**
 * Runs the registered {@link RequestTransformer}s over an outbound request, in
 * registration order, before it is serialized and sent. This is the single
 * place every Bot API call passes through, so a transformer applies uniformly
 * to sugar (`message.answer`), `BotService` methods, and returned command
 * objects alike.
 */
@Injectable()
export class RequestPipeline {
  private readonly transformers: RequestTransformer[];

  constructor(
    @Optional()
    @Inject(REQUEST_TRANSFORMERS)
    transformers: RequestTransformer[] | null,
  ) {
    this.transformers = transformers ?? [];
  }

  async run(request: ApiRequest): Promise<ApiRequest> {
    for (const transformer of this.transformers) {
      await transformer.transform(request);
    }
    return request;
  }
}
