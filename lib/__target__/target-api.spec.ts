/**
 * TARGET PUBLIC API — executable RDD checklist (Phase 1).
 *
 * This file encodes the public API Nestgram must expose, as a list of
 * `it.todo(...)` entries. Todos are PENDING by design: they document intent,
 * they do not assert behaviour yet. The suite therefore compiles and passes
 * today WITHOUT importing any not-yet-existing framework symbol.
 *
 * RULES for this file (keep it green at every step of Phase 1):
 *   - NEVER import a framework symbol that does not exist yet. The intended
 *     bot-author code lives in COMMENTS, not in real imports. The moment a
 *     symbol becomes real, its todo(s) may be promoted to a real `it(...)`
 *     with assertions — one at a time, keeping the suite green.
 *   - Each todo names ONE observable behaviour from the docs / VISION.md, in
 *     terms a bot author would recognise (a decorated method, an argument it
 *     receives, what its return value does).
 *
 * Source of truth: VISION.md, CLAUDE.md (locked decisions), ROADMAP.md
 * Phase 1, and docs/* (the docs-first DX spec, the public API target).
 *
 * The shape every todo refers to:
 *
 *   @Router()
 *   export class GreetingRouter {
 *     constructor(private readonly users: UsersService) {}
 *
 *     @Command('start')
 *     async start(message: Message) {
 *       await this.users.register(message.from.id);
 *       return `Welcome, ${message.from.first_name}!`;
 *     }
 *
 *     @OnMessage()
 *     echo(message: Message): string {
 *       return message.text;
 *     }
 *   }
 */

import { BotService } from '../api';
import { ContextFactory, EventFactory, resolveKind } from '../engine/context';
import { Message } from '../events';
import { RawUpdate } from '../types/raw-update.types';

/** Build a ContextFactory with a stub BotService (no network is touched). */
function buildContextFactory(): ContextFactory {
  const botService = { token: 'TEST' } as unknown as BotService;
  return new ContextFactory(botService, new EventFactory());
}

describe('Nestgram target public API (Phase 1)', () => {
  describe('Discovery & routing (boot-time route table)', () => {
    it.todo(
      'a class decorated with @Router() is discovered automatically — no manual routers list in forRoot',
    );
    it.todo(
      'the route table is built ONCE at startup (OnApplicationBootstrap), not per update',
    );
    it.todo(
      'a @Router() that is not registered as a provider is ignored (only DI-managed routers route)',
    );
    it.todo(
      'multiple @Router() classes are all discovered and their listeners merged into one table',
    );
    it.todo(
      'methods without a listener decorator are never invoked by an update',
    );
  });

  describe('@Command', () => {
    it.todo(
      "@Command('start') matches the text '/start' and invokes the handler",
    );
    it.todo(
      "@Command('start') matches '/start arg1 arg2' (command followed by args)",
    );
    it.todo("@Command('start') does NOT match a plain message 'start'");
    it.todo("@Command('start') does NOT match a different command '/help'");
    it.todo(
      "@Command('start') returning a string replies that string to the same chat",
    );
  });

  describe('@OnMessage', () => {
    it.todo('@OnMessage() matches any message update');
    it.todo(
      '@OnMessage() echoes message.text when the handler returns message.text',
    );
    it.todo('@OnMessage() does NOT match a callback_query update');
  });

  describe('@Hears (text patterns)', () => {
    it.todo("@Hears('ping') matches a message whose text equals 'ping'");
    it.todo('@Hears(/^buy (\\d+)$/) matches text by regular expression');
    it.todo('@Hears does NOT match a command like /start');
  });

  describe('@Action (callback queries)', () => {
    it.todo(
      "@Action('data') matches a callback_query whose data equals 'data'",
    );
    it.todo(
      '@Action() handler receives a typed CallbackQuery event positionally',
    );
    it.todo(
      'callback queries are auto-answered by a default (public, toggleable) primitive — not privileged core',
    );
    it.todo(
      'auto-answer of callback queries can be disabled via configuration',
    );
  });

  describe('The typed positional event (context by wrapping)', () => {
    it.todo(
      'a @OnMessage handler receives a Message instance as its first positional argument (no decorator)',
    );
    it.todo(
      'the Message event exposes message.text, message.from, message.chat from the raw payload',
    );
    it('the raw Update is NOT mutated — no _updateType / _telegramObject keys are added to it', () => {
      const update: RawUpdate = {
        update_id: 1,
        message: {
          message_id: 10,
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

    it('the typed event is produced by wrapping the raw update, leaving the original object untouched', () => {
      const rawMessage = {
        message_id: 10,
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
      // The rich event is a separate object built by wrapping; the raw payload
      // is left as-is (not replaced by the rich class).
      expect(event).not.toBe(rawMessage);
      expect(update.message).toBe(rawMessage);
      expect((event as Message).text).toBe('hi');
    });
  });

  describe('Event actions (rich context, command-object layer)', () => {
    it.todo('message.answer(text) sends a message to the same chat');
    it.todo('message.react(emoji) reacts to the incoming message');
    it.todo(
      'returning a command object (e.g. new SendMessage(chatId, text)) executes it',
    );
  });

  describe('Result handling contract', () => {
    it.todo('returning a string replies that string to the chat');
    it.todo('returning a command object executes the command');
    it.todo('returning void / undefined does nothing (noop)');
  });

  describe('Parameter decorators (derived / cross-cutting values only)', () => {
    // Intended usage (commented — symbols may not exist yet):
    //   @OnMessage()
    //   handle(message: Message, @Sender() user: User) { ... }
    it.todo('@Sender() injects the User who sent the update');
    it.todo('@Chat() injects the Chat the update happened in');
    it.todo('@Args() injects the whitespace-split arguments after a command');
    it.todo(
      "@Payload() injects the raw text remainder after a command (e.g. deep-link 'ref_123')",
    );
    it.todo('@CallbackData() injects the callback_query data string');
    it.todo(
      '@Match() injects the RegExpMatchArray for a regex @Action / @Hears',
    );
    it.todo(
      '@Session() injects the session object (stub in Phase 1, no backing store)',
    );
    it.todo(
      'the main event argument stays positional and undecorated even when param decorators are present',
    );
  });

  describe('Nest pipeline via ExternalContextCreator', () => {
    // Intended usage (commented — these are standard Nest symbols, but the
    // wiring that makes them apply to Telegram updates does not exist yet):
    //   @UseGuards(AllowlistGuard)
    //   @Command('admin')
    //   admin(message: Message) { ... }
    it.todo(
      '@UseGuards on a handler blocks the handler when the guard returns false',
    );
    it.todo(
      '@UseGuards allows the handler when the guard returns true, and the guard sees the execution context',
    );
    it.todo('@UseInterceptors wraps the handler and can transform its result');
    it.todo(
      '@UsePipes / a param pipe transforms a derived param value before the handler runs',
    );
    it.todo(
      'an exception filter (@UseFilters) catches an error thrown inside a handler',
    );
    it.todo(
      'a guard / interceptor / pipe / filter behaves identically to HTTP NestJS — no Nestgram-specific adaptation',
    );
    it.todo(
      'TelegramExecutionContext.of(context) exposes from / chat / event / type / update inside a guard',
    );
    it.todo(
      'the parallel middleware system is gone: NestgramMiddleware / MiddlewareService / NestgramFilter are removed, cross-cutting uses Nest primitives only',
    );
  });

  describe('Dependency injection in routers', () => {
    it.todo(
      'a @Router() can inject a provider via the constructor and use it inside a handler',
    );
    it.todo(
      'request-scoped providers resolve per update (contextId per update)',
    );
  });

  describe('Update source (polling now, webhook later)', () => {
    it.todo('polling feeds updates to the executor');
    it.todo('updates are processed with bounded concurrency');
    it.todo(
      'a failure handling one update does not stop the loop or affect other updates (per-update isolation)',
    );
    it.todo(
      'swapping polling for webhooks is a configuration change, not a handler code change',
    );
  });

  describe('Bootstrap & configuration', () => {
    // Intended usage (commented — module shape is the documented target):
    //   @Module({
    //     imports: [NestgramModule.forRoot({ token: process.env.BOT_TOKEN })],
    //     providers: [GreetingRouter],
    //   })
    //   export class AppModule {}
    it.todo('NestgramModule.forRoot({ token }) boots a working bot');
    it.todo('forRoot does NOT require a routers array (discovery handles it)');
    it.todo(
      'built-in conveniences (auto-answer, default parseMode) are toggleable via forRoot options',
    );
  });
});
