import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/**
 * Run with: `BOT_TOKEN=123456:your-token npx ts-node -r tsconfig-paths/register
 * examples/keyboard-playground/main.ts` from the repo root (see README).
 * A polling bot needs no HTTP server — it's a plain application context.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks(); // lets polling stop cleanly on Ctrl-C
}

void bootstrap();
