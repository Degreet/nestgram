import { Module } from '@nestjs/common';
import { NestgramModule, ScenesModule } from 'nestgram';

import { GreetRouter } from './greet.router';
import { FeedbackScene } from './feedback.scene';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      parseMode: 'HTML',
    }),
    // Enables @Scene wizards. The default in-memory store is fine for a demo;
    // point it at a shared store (e.g. Redis) to survive restarts.
    ScenesModule.forRoot(),
  ],
  providers: [GreetRouter, FeedbackScene],
})
export class AppModule {}
