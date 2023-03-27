import * as editJsonFile from 'edit-json-file';
import * as fs from 'fs/promises';

import * as path from 'path';

export class MediaCache {
  nestgramInfoDirPath: string;
  mediaKeeperFilePath: string;
  file: editJsonFile.JsonEditor;

  constructor(private readonly cachePath?: string) {
    this.nestgramInfoDirPath = path.resolve(cachePath || process.cwd(), 'nestgram');
    this.mediaKeeperFilePath = path.resolve(this.nestgramInfoDirPath, 'media.json');
    this.getJSONFile();
  }

  private async getJSONFile(): Promise<void> {
    try {
      await fs.access(this.mediaKeeperFilePath);
    } catch (e: any) {
      try {
        await fs.access(this.nestgramInfoDirPath);
      } catch (e: any) {
        await fs.mkdir(path.resolve(this.nestgramInfoDirPath));
      }

      await fs.writeFile(this.mediaKeeperFilePath, '{}');
    }

    this.file = editJsonFile(this.mediaKeeperFilePath, { autosave: true });
  }

  saveMediaFileId(path: string, fileId: string): void {
    this.file.set(path, fileId);
  }

  getMediaFileId(path: string): string | undefined {
    // @ts-ignore
    return this.file.data[path];
  }
}

export default MediaCache;
