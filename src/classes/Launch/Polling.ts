import { IPollingConfig, IHandler, IUpdate } from '../../types';
import { error } from '../../logger';
import { Handler } from './Handler';
import { Api } from '../Api';

export class Polling {
  api: Api = new Api(this.token, this.cachePath);
  handler: Handler = new Handler(
    this.token,
    this.handlers,
    this.logging,
    this.fileLogging,
    this.fileLoggingLimit,
    this.cachePath,
  );

  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly config?: IPollingConfig | null,
    private readonly logging?: boolean,
    private readonly fileLogging?: boolean,
    private readonly fileLoggingLimit?: number,
    private readonly cachePath?: string,
  ) {
    if (!this.token) throw error(`You can't run bot without token`);
  }

  public async start(): Promise<void> {
    for await (const updates of this.updateGetter()) {
      for (const update of await updates) {
        // handle got update
        await this.handler.handleUpdate(update);

        // mark update as read
        await this.api.call(this.token, 'getUpdates', {
          ...(this.config || {}),
          offset: update.update_id + 1,
        });
      }
    }
  }

  private async* updateGetter(): AsyncIterableIterator<Promise<any>> {
    while (true) {
      const updates = await this.api.call<IUpdate, IPollingConfig>(
        this.token,
        'getUpdates',
        this.config,
      );

      yield updates;
    }
  }
}
