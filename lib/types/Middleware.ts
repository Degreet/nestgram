import { Update } from './Update';

export type Middleware = (
  update: Update,
  next: () => Promise<unknown> | unknown,
) => Promise<unknown> | unknown;
