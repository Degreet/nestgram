import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramExecutionContext } from 'nestgram';

import type { AppConfig } from '../config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const userId = TelegramExecutionContext.of(context).from?.id;
    const admins = this.config.getOrThrow<AppConfig>('app').adminIds;
    return userId !== undefined && admins.includes(userId);
  }
}
