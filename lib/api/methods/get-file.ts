import { ApiMethod } from './api-method';
import type { RawFile } from '../../events/raw-update.types';

export interface GetFileOptions {
  file_id: string;
}

export class GetFile extends ApiMethod<GetFileOptions, RawFile> {
  readonly method = 'getFile';

  readonly throttled = false;

  constructor(payload: GetFileOptions) {
    super(payload);
  }
}
