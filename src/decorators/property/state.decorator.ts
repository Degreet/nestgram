/**
 * Get state. You can use it to store user data
 * @see https://degreetpro.gitbook.io/nestgram/advenced/states
 * */
export function GetState(): PropertyDecorator {
  return (target: any, key: string): void => {
    Reflect.defineMetadata('getState', key, target, 'state');
  };
}
