import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'purchased_paid_media';

export const OnPurchasedPaidMedia = (
  ...filters: NestgramFilter[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};
