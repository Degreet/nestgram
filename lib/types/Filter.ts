import { Update } from './Update';

export type Filter = (update: Update) => Promise<boolean> | boolean;
