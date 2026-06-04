import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramExecutionContext } from 'nestgram';

import type { AppConfig } from '../config';

/**
 * A standard Nest guard — the same primitive you'd use on an HTTP route — reading
 * the Telegram update via `TelegramExecutionContext.of`. Allows only the user
 * ids listed in `ADMIN_IDS`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const userId = TelegramExecutionContext.of(context).from?.id;
    const admins = this.config.getOrThrow<AppConfig>('app').adminIds;
    return userId !== undefined && admins.includes(userId);
  }
}
