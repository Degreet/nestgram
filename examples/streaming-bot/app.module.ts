import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { AssistantRouter } from './assistant.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
  ],
  providers: [AssistantRouter],
})
export class AppModule {}
