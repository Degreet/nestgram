/**
 * Get api. You can use it to send message for another user {@link Api}
 * @type {Api}
 * @see https://degreetpro.gitbook.io/nestgram/advenced/get-api
 * */
export function GetApi(): PropertyDecorator {
  return (target: any, key: string): void => {
    Reflect.defineMetadata('getApi', key, target, 'api');
  };
}
