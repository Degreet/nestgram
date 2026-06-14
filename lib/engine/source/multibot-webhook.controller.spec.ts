import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';

import {
  MultiBotWebhookController,
  SharedWebhookController,
  createMultiBotWebhookController,
  createSharedWebhookController,
} from './multibot-webhook.controller';
import { WEBHOOK_PATH } from './webhook.constants';
import {
  WebhookSourceEntry,
  WebhookUpdateSource,
} from './webhook-update-source';
import { RawUpdate } from '../../events/raw-update.types';

const update = { update_id: 1 } as RawUpdate;

/** The handler shapes the factory-built controllers expose (typed `Type<unknown>`). */
interface PathController {
  handle(botName: string, update: RawUpdate, secret?: string): void;
}
interface SharedController {
  handle(update: RawUpdate, secret?: string): void;
}

/**
 * A WebhookUpdateSource stub keyed by name and secret: `ownsSecret` matches the
 * configured secret exactly (shared-endpoint routing), `verifySecret` is
 * permissive when no secret is set (path-endpoint gate).
 */
function sourceStub(name: string, secretToken?: string) {
  const deliver = jest.fn();
  const source = {
    name,
    deliver,
    verifySecret: (header?: string) =>
      secretToken === undefined ? true : header === secretToken,
    ownsSecret: (header?: string) =>
      secretToken !== undefined && header === secretToken,
  } as unknown as WebhookUpdateSource;
  return { source, deliver };
}

describe('MultiBotWebhookController (path-based)', () => {
  function make(entries: WebhookSourceEntry[]): PathController {
    const Ctor = MultiBotWebhookController as unknown as new (
      e: WebhookSourceEntry[],
    ) => PathController;
    return new Ctor(entries);
  }

  it('is served under the default webhook path with a :botName segment', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MultiBotWebhookController)).toBe(
      WEBHOOK_PATH,
    );
  });

  it('delivers to the named bot when its secret is valid', () => {
    const support = sourceStub('support', 's-secret');
    const sales = sourceStub('sales', 'x-secret');
    const controller = make([
      { source: support.source, isDefault: true },
      { source: sales.source, isDefault: false },
    ]);

    controller.handle('sales', update, 'x-secret');

    expect(sales.deliver).toHaveBeenCalledWith(update);
    expect(support.deliver).not.toHaveBeenCalled();
  });

  it('404s an unknown bot name', () => {
    const support = sourceStub('support', 's-secret');
    const controller = make([{ source: support.source, isDefault: true }]);

    expect(() => controller.handle('ghost', update, 's-secret')).toThrow(
      NotFoundException,
    );
  });

  it('403s a bad secret for a known bot', () => {
    const support = sourceStub('support', 's-secret');
    const controller = make([{ source: support.source, isDefault: true }]);

    expect(() => controller.handle('support', update, 'wrong')).toThrow(
      ForbiddenException,
    );
    expect(support.deliver).not.toHaveBeenCalled();
  });

  it('binds to a custom base path via the factory', () => {
    const Custom = createMultiBotWebhookController('hooks');
    expect(Reflect.getMetadata(PATH_METADATA, Custom)).toBe('hooks');
  });
});

describe('SharedWebhookController (single endpoint, secret-routed)', () => {
  function make(entries: WebhookSourceEntry[]): SharedController {
    const Ctor = SharedWebhookController as unknown as new (
      e: WebhookSourceEntry[],
    ) => SharedController;
    return new Ctor(entries);
  }

  it('routes to the bot whose secret matches the header', () => {
    const support = sourceStub('support', 's-secret');
    const sales = sourceStub('sales', 'x-secret');
    const controller = make([
      { source: support.source, isDefault: true },
      { source: sales.source, isDefault: false },
    ]);

    controller.handle(update, 'x-secret');

    expect(sales.deliver).toHaveBeenCalledWith(update);
    expect(support.deliver).not.toHaveBeenCalled();
  });

  it('falls back to the default bot when no secret matches', () => {
    const support = sourceStub('support', 's-secret');
    const sales = sourceStub('sales', 'x-secret');
    const controller = make([
      { source: support.source, isDefault: true },
      { source: sales.source, isDefault: false },
    ]);

    controller.handle(update, 'unmatched');

    expect(support.deliver).toHaveBeenCalledWith(update);
    expect(sales.deliver).not.toHaveBeenCalled();
  });

  it('drops with a warning when nothing matches and there is no default', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const a = sourceStub('a', 'a-secret');
    const b = sourceStub('b', 'b-secret');
    const controller = make([
      { source: a.source, isDefault: false },
      { source: b.source, isDefault: false },
    ]);

    controller.handle(update, 'unmatched');

    expect(a.deliver).not.toHaveBeenCalled();
    expect(b.deliver).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no default bot'),
    );
    warn.mockRestore();
  });

  it('is served at the default webhook path; factory binds a custom one', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SharedWebhookController)).toBe(
      WEBHOOK_PATH,
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, createSharedWebhookController('wh')),
    ).toBe('wh');
  });
});
