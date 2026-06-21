import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { MediaRouter } from './media.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
  ],
  providers: [MediaRouter],
})
export class AppModule {}
