import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import type { AppConfig } from './config';

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
