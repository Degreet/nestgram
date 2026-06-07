import { ApiMethod } from './api-method';

export interface DeleteBusinessMessagesOptions {
  business_connection_id: string;
  message_ids: number[];
}

export class DeleteBusinessMessages extends ApiMethod<
  DeleteBusinessMessagesOptions,
  true
> {
  readonly method = 'deleteBusinessMessages';

  constructor(payload: DeleteBusinessMessagesOptions) {
    super(payload);
  }
}
