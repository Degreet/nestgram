/**
 * TARGET PUBLIC API — RDD checklist (Phase 1).
 *
 * Originally a list of `it.todo` intents. As behaviours shipped, each was
 * promoted to a real assertion — most now live in `acceptance.spec.ts` (the
 * public API exercised end to end through a booted app) and the focused unit
 * specs (route-matcher, events, keyboards, result-handler, auto-answer,
 * nestgram.module). What remains here:
 *   - the two context-by-wrapping invariants (asserted directly below), and
 *   - `it.todo`s for behaviours NOT yet in Phase 1 (Phase 2+ or deferred).
 *
 * Source of truth: VISION.md, CLAUDE.md (locked decisions), ROADMAP.md, docs/*.
 */

import { BotService } from '../api';
import { ContextFactory, EventFactory, resolveKind } from '../engine/context';
import { Message } from '../events';
import { RawUpdate } from '../events/raw-update.types';

/** Build a ContextFactory with a stub BotService (no network is touched). */
function buildContextFactory(): ContextFactory {
  const botService = { token: 'TEST' } as unknown as BotService;
  return new ContextFactory(botService, new EventFactory());
}

describe('Context by wrapping (no mutation)', () => {
  it('the raw Update is NOT mutated — no _updateType / _telegramObject keys are added', () => {
    const update: RawUpdate = {
      update_id: 1,
      message: {
        message_id: 10,
        date: 1,
        chat: { id: 5, type: 'private' },
        text: 'hi',
      },
    };
    const before = JSON.stringify(update);

    const ctx = buildContextFactory().wrap(update);
    expect(ctx).not.toBeNull();
    // Force the (lazy) event to be built; this must not write back to update.
    void ctx?.event;

    expect('_updateType' in update).toBe(false);
    expect('_telegramObject' in update).toBe(false);
    expect(JSON.stringify(update)).toBe(before);
  });

  it('the typed event is produced by wrapping, leaving the original object untouched', () => {
    const rawMessage = {
      message_id: 10,
      date: 1,
      chat: { id: 5, type: 'private' as const },
      text: 'hi',
    };
    const update: RawUpdate = { update_id: 1, message: rawMessage };

    const ctx = buildContextFactory().wrap(update);
    if (!ctx) {
      throw new Error('expected a resolvable update');
    }
    const event = ctx.event;

    expect(ctx.kind).toBe(resolveKind(update));
    expect(event).toBeInstanceOf(Message);
    expect(event).not.toBe(rawMessage);
    expect(update.message).toBe(rawMessage);
    expect((event as Message).text).toBe('hi');
  });
});

// Param pipes (incl. ValidationPipe + class-validator DTOs) run through the
// same ECC path as guards/interceptors/filters — proven end to end in
// command-args/command-args.dispatch.spec.ts.

describe('Not yet implemented (Phase 2+ / deferred)', () => {
  it.todo('@Match() injects the RegExpMatchArray for a regex @Action / @Hears');
  it.todo(
    '@Session() injects a session object backed by a store (in-memory / Redis)',
  );
  it.todo('message.react(emoji) reacts to the incoming message');
  it.todo('request-scoped providers resolve per update (contextId per update)');
  it.todo('updates are processed with bounded concurrency');
  // Shipped: webhook transport (webhook-update-source.spec, webhook.controller.spec,
  // nestgram.module.spec wiring) and the typed callback-data factory
  // (callback-data.factory.spec, acceptance.spec).
});
