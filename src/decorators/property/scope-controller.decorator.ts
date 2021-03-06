/**
 * Get property. You can use it to enter/leave scope
 * @see https://degreetpro.gitbook.io/nestgram/basics/scopes
 * */
export function GetScopeController(): PropertyDecorator {
  return (target: any, key: string): void => {
    Reflect.defineMetadata('getScopeController', key, target, 'scopeController');
  };
}
