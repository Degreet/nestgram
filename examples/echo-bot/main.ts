import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/**
 * Run with: `BOT_TOKEN=123456:your-token node dist/main.js`
 * A polling bot needs no HTTP server — it's a plain application context.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks(); // lets polling stop cleanly on Ctrl-C
}

void bootstrap();
