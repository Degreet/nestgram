import { IScopeInfo } from '../../types/scope.types';
import { ScopeClass, ServiceClass } from '../../types';
import { NestGram } from '../../nest-gram';
import { stateStore } from '../State/StateStore';

class ScopeStore {
  protected scopes: IScopeInfo[] = [];

  importScopes(Module: any): true {
    const scopes: ScopeClass[] = Reflect.getMetadata('scopes', Module) || [];

    scopes.forEach(async (scope: ScopeClass): Promise<void> => {
      const services: ServiceClass[] = await NestGram.getServices(Module);
      scope = new (scope as any)(...services);

      const name: string = scope.constructor.name.replace('Scope', '').toLowerCase();
      this.scopes.push({ name, scope });
    });

    return true;
  }

  getScope(scopeId: string): IScopeInfo | undefined {
    return this.scopes.find((scope: IScopeInfo): boolean => scope.name == scopeId);
  }

  setCurrentScope(userId: number, scopeId: string): true {
    const userState: { __currentScope?: string } = stateStore.getStore(userId);
    userState.__currentScope = scopeId;
    return true;
  }

  getCurrent(userId: number): string | undefined {
    return stateStore.getStore(userId).__currentScope;
  }
}

export const scopeStore: ScopeStore = new ScopeStore();
