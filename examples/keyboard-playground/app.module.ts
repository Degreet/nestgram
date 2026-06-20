import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { CatalogService } from './catalog.service';
import { BasicsRouter } from './basics.router';
import { PickerRouter } from './picker.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      parseMode: 'HTML',
    }),
  ],
  // Per-message keyboard state auto-wires with an in-memory store — no import,
  // fine for a demo. Pass `keyboardState: { store }` to `forRoot` above to back
  // it with a shared store (e.g. Redis) so picks survive restarts and scale
  // across servers. (With sessions on, it reuses the session store by default.)
  providers: [CatalogService, BasicsRouter, PickerRouter],
})
export class AppModule {}
