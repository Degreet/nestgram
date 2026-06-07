import { ApiMethod } from './api-method';
import type { RawBusinessConnection } from '../../events/raw-update.types';

export interface GetBusinessConnectionOptions {
  business_connection_id: string;
}

/**
 * Use this method to get information about the connection of the bot with a business account. Returns a BusinessConnection object on success.
 * @see https://core.telegram.org/bots/api#getbusinessconnection
 */
export class GetBusinessConnection extends ApiMethod<
  GetBusinessConnectionOptions,
  RawBusinessConnection
> {
  readonly method = 'getBusinessConnection';

  constructor(payload: GetBusinessConnectionOptions) {
    super(payload);
  }
}
