import { ApiMethod } from './api-method';
import type { RawBusinessConnection } from '../../events/raw-update.types';

export interface GetBusinessConnectionOptions {
  business_connection_id: string;
}

export class GetBusinessConnection extends ApiMethod<
  GetBusinessConnectionOptions,
  RawBusinessConnection
> {
  readonly method = 'getBusinessConnection';

  constructor(payload: GetBusinessConnectionOptions) {
    super(payload);
  }
}
