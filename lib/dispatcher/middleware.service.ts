import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MiddlewareService {
  private readonly logger = new Logger(MiddlewareService.name);
}
