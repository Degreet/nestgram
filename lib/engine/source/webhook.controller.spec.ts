import { ForbiddenException } from '@nestjs/common';

import { WebhookController } from './webhook.controller';
import { WebhookUpdateSource } from './webhook-update-source';
import { RawUpdate } from '../../events/raw-update.types';

function make(secretValid: boolean) {
  const deliver = jest.fn();
  const source = {
    verifySecret: () => secretValid,
    deliver,
  } as unknown as WebhookUpdateSource;
  return { controller: new WebhookController(source), deliver };
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
});
