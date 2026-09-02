import { BotService } from '../api';
import { UpdateKind } from '../engine/context';
import { EventFactory } from '../engine/context/event-factory';
import { RawUpdate } from './raw-update.types';
// Importing the classes runs their @UpdateType registration.
import { BotSubscriptionUpdated } from './bot-subscription-updated';
import { ChatJoinRequest } from './chat-join-request';
import { ChatMemberUpdated } from './chat-member-updated';
import { InlineQuery } from './inline-query';
import { ManagedBotUpdated } from './managed-bot-updated';
import { MessageGenerationStopped } from './message-generation-stopped';
import { Poll } from './poll';

interface RecordedCall {
  method: string;
  payload: unknown;
}

function fakeBot(calls: RecordedCall[]): BotService {
  return {
    call(method: { method: string; payload: unknown }) {
      calls.push({ method: method.method, payload: method.payload });
      return Promise.resolve(undefined);
    },
  } as unknown as BotService;
}

function build(kind: UpdateKind, payload: object, bot: BotService) {
  const update = { update_id: 1, [kind]: payload } as unknown as RawUpdate;
  return new EventFactory().build(update, kind, bot, new Map());
}

describe('Rich events', () => {
  it('builds the registered class for a kind (instanceof)', () => {
    const bot = fakeBot([]);
    expect(build(UpdateKind.InlineQuery, { id: 'q' }, bot)).toBeInstanceOf(
      InlineQuery,
    );
    expect(build(UpdateKind.Poll, { id: 'p' }, bot)).toBeInstanceOf(Poll);
  });

  it('registers ChatMemberUpdated for both my_chat_member and chat_member', () => {
    const bot = fakeBot([]);
    expect(build(UpdateKind.MyChatMember, {}, bot)).toBeInstanceOf(
      ChatMemberUpdated,
    );
    expect(build(UpdateKind.ChatMember, {}, bot)).toBeInstanceOf(
      ChatMemberUpdated,
    );
  });

  it('copies the raw payload onto the event', () => {
    const poll = build(
      UpdateKind.Poll,
      { id: 'p', question: 'Tea?' },
      fakeBot([]),
    ) as Poll;
    expect(poll.id).toBe('p');
    expect(poll.question).toBe('Tea?');
  });

  it('builds BotSubscriptionUpdated for a subscription update', () => {
    const event = build(
      UpdateKind.Subscription,
      { invoice_payload: 'sub_monthly', state: 'active' },
      fakeBot([]),
    ) as BotSubscriptionUpdated;
    expect(event).toBeInstanceOf(BotSubscriptionUpdated);
    expect(event.invoice_payload).toBe('sub_monthly');
    expect(event.state).toBe('active');
  });

  it('builds ManagedBotUpdated for a managed_bot update', () => {
    const event = build(
      UpdateKind.ManagedBot,
      { user: { id: 7 }, bot: { id: 8, is_bot: true } },
      fakeBot([]),
    ) as ManagedBotUpdated;
    expect(event).toBeInstanceOf(ManagedBotUpdated);
    expect(event.user.id).toBe(7);
    expect(event.bot.id).toBe(8);
  });

  it('builds MessageGenerationStopped for a stopped_message_generation update', () => {
    const event = build(
      UpdateKind.MessageGenerationStopped,
      { chat: { id: -100, type: 'supergroup' }, draft_id: 9 },
      fakeBot([]),
    ) as MessageGenerationStopped;
    expect(event).toBeInstanceOf(MessageGenerationStopped);
    expect(event.draft_id).toBe(9);
    expect(event.chat.id).toBe(-100);
  });

  it('InlineQuery.answer calls answerInlineQuery with the query id', async () => {
    const calls: RecordedCall[] = [];
    const query = new InlineQuery(fakeBot(calls), {
      id: 'q1',
    } as Partial<InlineQuery>);
    await query.answer([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('answerInlineQuery');
    expect(calls[0].payload).toMatchObject({
      inline_query_id: 'q1',
      results: [],
    });
  });

  it('ChatJoinRequest.approve / decline target the chat and user', async () => {
    const calls: RecordedCall[] = [];
    const raw = {
      chat: { id: 5 },
      from: { id: 7 },
    } as unknown as Partial<ChatJoinRequest>;
    const request = new ChatJoinRequest(fakeBot(calls), raw);
    await request.approve();
    await request.decline();
    expect(calls.map((call) => call.method)).toEqual([
      'approveChatJoinRequest',
      'declineChatJoinRequest',
    ]);
    expect(calls[0].payload).toMatchObject({ chat_id: 5, user_id: 7 });
  });
});
