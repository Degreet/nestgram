import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import type { AppConfig } from './config';

/**
 * A full HTTP Nest app: long polling ignores the server, webhook delivery uses
 * it (the `WebhookController` is mounted in AppModule). `enableShutdownHooks`
 * lets Nestgram stop the update source and drain in-flight work on SIGINT/SIGTERM.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();

  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');
  await app.listen(config.port);

  new Logger('Bootstrap').log(
    `Reminder bot is up on :${config.port} ` +
      `(${config.useWebhook ? 'webhook' : 'polling'} transport)`,
  );
}

void bootstrap();
