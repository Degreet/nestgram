import { Type } from '@nestjs/common';
import { NestgramFilter } from './NestgramFilter';

export interface ListenerOptions {
  updateType: string;
  filters?: NestgramFilter[];
}
