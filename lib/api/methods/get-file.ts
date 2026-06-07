import { ApiMethod } from './api-method';
import type { RawFile } from '../../events/raw-update.types';

export interface GetFileOptions {
  file_id: string;
}

/**
 * Use this method to get basic information about a file and prepare it for downloading. For the moment, bots can download files of up to 20MB in size. On success, a File object is returned. The file can then be downloaded via the link https://api.telegram.org/file/bot<token>/<file_path>, where <file_path> is taken from the response. It is guaranteed that the link will be valid for at least 1 hour. When the link expires, a new one can be requested by calling getFile again.
 * Note: This function may not preserve the original file name and MIME type. You should save the file's MIME type and name (if available) when the File object is received.
 * @see https://core.telegram.org/bots/api#getfile
 */
export class GetFile extends ApiMethod<GetFileOptions, RawFile> {
  readonly method = 'getFile';

  constructor(payload: GetFileOptions) {
    super(payload);
  }
}
