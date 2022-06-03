export function GetApi(): PropertyDecorator {
  return (target: any, key: string): void => {
    Reflect.defineMetadata('getApi', true, target, key);
  };
}
