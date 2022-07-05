/**
 * Get property. You can use it to send message for another user {@link Answer}
 * @type {Answer}
 * */
export function GetAnswerContext(): PropertyDecorator {
  return (target: any, key: string): void => {
    Reflect.defineMetadata('getAnswer', key, target, 'answer');
  };
}
