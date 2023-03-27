import { IUpdate } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileLogger {
  nestgramInfoDirPath: string;
  logsFilePath: string;

  constructor(private readonly limit: number,
              private readonly isFileLoggingEnabled: boolean,
              private readonly cachePath?: string) {
    if (isFileLoggingEnabled) {
      this.nestgramInfoDirPath = path.resolve(cachePath || process.cwd(), 'nestgram');
      this.logsFilePath = path.resolve(this.nestgramInfoDirPath, 'logs.md');
      this.setupLogsFile();
    }
  }

  private async setupLogsFile(): Promise<void> {
    try {
      await fs.access(this.logsFilePath);
    } catch (e: any) {
      try {
        await fs.access(this.nestgramInfoDirPath);
      } catch (e: any) {
        await fs.mkdir(path.resolve(this.nestgramInfoDirPath));
      }

      await fs.writeFile(this.logsFilePath, '');
    }
  }

  async saveLog(update: IUpdate): Promise<void> {
    const date: string = new Date().toISOString();
    const oldLogsFileText: string = (await fs.readFile(this.logsFilePath)).toString();
    const updateText = JSON.stringify(update, null, 2);

    const titleLines: string[] = oldLogsFileText
      .split('\n')
      .filter((line: string): boolean => line.startsWith('#'));

    let newLogsFileText: string;
    newLogsFileText = `# ${update.update_id} (${date})`;
    newLogsFileText += `\n\n${updateText}`;
    if (titleLines.length < this.limit) newLogsFileText += `\n\n${oldLogsFileText || ''}`;

    await fs.writeFile(this.logsFilePath, newLogsFileText);
  }
}
