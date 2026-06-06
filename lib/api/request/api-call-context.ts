import type { ApiMethod } from '../methods/api-method';
import type {
  ApiContextType,
  ApiExecutionContext,
} from './api-interceptor.types';
import type { ApiRequest } from './request.types';

/** The single value `getType()` reports for the outbound call context. */
const TELEGRAM_API_CONTEXT: ApiContextType = 'telegram:api';

/**
 * Concrete {@link ApiExecutionContext} over one outbound call — built by
 * `BotService.call` and passed to every {@link ApiInterceptor}. A plain value
 * object: it holds the mutable request, the command object, and the per-call
 * abort signal, and hands them back through the accessors.
 */
export class ApiCallContext implements ApiExecutionContext {
  constructor(
    private readonly request: ApiRequest,
    private readonly method: ApiMethod<unknown, unknown>,
    private readonly signal?: AbortSignal,
  ) {}

  getRequest(): ApiRequest {
    return this.request;
  }

  getMethod(): ApiMethod<unknown, unknown> {
    return this.method;
  }

  getSignal(): AbortSignal | undefined {
    return this.signal;
  }

  getType(): ApiContextType {
    return TELEGRAM_API_CONTEXT;
  }
}
