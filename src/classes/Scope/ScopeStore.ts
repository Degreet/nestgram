import { IScopeInfo } from '../../types/scope.types';
import { ScopeClass, ServiceClass } from '../../types';
import { NestGram } from '../../nest-gram';

class ScopeStore {
  protected scopes: IScopeInfo[] = [];
  protected currentInfo: [number, string][] = [];

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
    const currentUserInfo: [number, string] | undefined = this.currentInfo.find(
      (currentInfo: [number, string]): boolean => currentInfo[0] === userId,
    );

    if (currentUserInfo) currentUserInfo[1] = scopeId;
    else this.currentInfo.push([userId, scopeId]);

    return true;
  }

  getCurrent(userId: number): string | undefined {
    return (this.currentInfo.find((info: [number, string]): boolean => info[0] === userId) ||
      [])[1];
  }
}

export const scopeStore: ScopeStore = new ScopeStore();
