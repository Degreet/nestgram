import { IHandler, IUpdate, IWebhookConfig } from '../../types';
import { error } from '../../logger';
import { Handler } from './Handler';
import { Api } from '../Api';

import { IncomingMessage, ServerResponse } from 'http';
import * as http from 'http';

export class Webhook {
  api: Api = new Api(this.token);
  handler: Handler = new Handler(this.token, this.handlers, this.logging);
  server: http.Server;

  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly config?: IWebhookConfig | null,
    private readonly port: number = 80,
    private readonly logging?: true,
  ) {
    if (!this.token) throw error(`You can't run bot without token`);
    this.api.setWebhook(this.config);

    this.server = http
      .createServer(async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        try {
          let data: string = '';
          req.on('data', (chunk: string): any => (data += chunk));

          req.on('end', async (): Promise<any> => {
            try {
              const update: IUpdate = JSON.parse(data.toString());
              await this.handler.handleUpdate(update);
              res.end('ok');
            } catch (e: any) {
              console.error(e);
            }
          });
        } catch (e: any) {
          throw error(e);
        }
      })
      .listen(port);
  }
}
