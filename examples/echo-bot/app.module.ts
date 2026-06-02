import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { GreetRouter } from './greet.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      parseMode: 'HTML',
    }),
  ],
  providers: [GreetRouter],
})
export class AppModule {}
