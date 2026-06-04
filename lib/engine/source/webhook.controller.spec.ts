import { ForbiddenException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';

import {
  WebhookController,
  createWebhookController,
} from './webhook.controller';
import { WEBHOOK_PATH } from './webhook.constants';
import { WebhookUpdateSource } from './webhook-update-source';
import { RawUpdate } from '../../events/raw-update.types';

function make(secretValid: boolean, Controller = WebhookController) {
  const deliver = jest.fn();
  const source = {
    verifySecret: () => secretValid,
    deliver,
  } as unknown as WebhookUpdateSource;
  return { controller: new Controller(source), deliver };
}

describe('WebhookController', () => {
  const update = { update_id: 1 } as RawUpdate;

  it('delivers the update when the secret token is valid', () => {
    const { controller, deliver } = make(true);
    controller.handle(update, 'secret');
    expect(deliver).toHaveBeenCalledWith(update);
  });

  it('rejects with Forbidden when the secret token is invalid', () => {
    const { controller, deliver } = make(false);
    expect(() => controller.handle(update, 'wrong')).toThrow(
      ForbiddenException,
    );
    expect(deliver).not.toHaveBeenCalled();
  });

  it('is served at the default webhook path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebhookController)).toBe(
      WEBHOOK_PATH,
    );
  });
});

describe('createWebhookController', () => {
  const update = { update_id: 1 } as RawUpdate;

  it('binds the controller to a custom path', () => {
    const Custom = createWebhookController('direction/:botId/webhook');
    expect(Reflect.getMetadata(PATH_METADATA, Custom)).toBe(
      'direction/:botId/webhook',
    );
  });

  it('still verifies the secret and delivers on the custom-path controller', () => {
    const Custom = createWebhookController('direction/:botId/webhook');
    const { controller, deliver } = make(true, Custom);
    controller.handle(update, 'secret');
    expect(deliver).toHaveBeenCalledWith(update);
  });
});
