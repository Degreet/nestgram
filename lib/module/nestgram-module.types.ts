import { PollingOptions } from '../source';

/**
 * Options for `NestgramModule.forRoot`.
 *
 * Note there is no `routers` list: routers are discovered from the Nest provider
 * graph (`@Router()` classes), so adding one never means editing the module too.
 */
export interface NestgramModuleOptions {
  /** Bot API token. */
  token: string;
  /**
   * Long-polling transport. `true` uses defaults; pass an object to tune
   * offset/limit/timeout/etc. Omit to start the bot without a transport (e.g.
   * to drive the dispatcher yourself, or in tests). Webhook support lands in a
   * later phase via its own update source.
   */
  polling?: boolean | PollingOptions;
}
