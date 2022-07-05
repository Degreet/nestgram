import { IScopeInfo } from '../../types/scope.types';
import { error } from '../../logger';
import { scopeStore } from './ScopeStore';

export class ScopeController {
  constructor() {}

  async enter(userId: number, scopeId: string): Promise<true> {
    const scope: IScopeInfo | undefined = scopeStore.getScope(scopeId);
    if (!scope) throw error(`Can't find scope '${scopeId}'`);

    scopeStore.setCurrentScope(userId, scopeId);
    return true;
  }

  async leave(userId: number): Promise<true> {
    scopeStore.setCurrentScope(userId, '');
    return true;
  }
}
