import { callbackData } from 'nestgram';

export const DoneCb = callbackData('done', { id: Number });
export const DeleteCb = callbackData('del', { id: Number });
