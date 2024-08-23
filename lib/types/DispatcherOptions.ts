import { ModuleMetadata, Type } from '@nestjs/common';
import { GetUpdatesOptions } from '../methods';

export interface DispatcherOptions extends GetUpdatesOptions {
  drop_pending_updates?: boolean;
}

export interface DispatcherAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<DispatcherOptions>;
  useClass?: Type<DispatcherOptions>;
  useFactory?: (
    ...args: any[]
  ) => Promise<DispatcherOptions> | DispatcherOptions;
}
