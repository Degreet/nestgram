import { Update } from '../types';

export function extractUpdateType(update: Update): string {
  const keys = Object.keys(update);
  const [updateType] = keys.filter((key) => key !== 'update_id');
  return updateType;
}
