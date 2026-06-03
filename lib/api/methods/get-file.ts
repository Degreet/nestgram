import { ApiMethod } from './api-method';
import { RawFile } from '../../events/raw-update.types';

export interface GetFileOptions {
  file_id: string;
}

/** Resolves a `file_id` to a `File` with a temporary `file_path` for download. */
export class GetFile extends ApiMethod<GetFileOptions, RawFile> {
  readonly method = 'getFile';

  constructor(payload: GetFileOptions) {
    super(payload);
  }
}
