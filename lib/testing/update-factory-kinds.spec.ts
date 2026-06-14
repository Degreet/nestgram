/**
 * Dogfoods the {@link UpdateFactory} builders for the routable update kinds
 * beyond the original four: each kind gets a router with the REAL `@On*`
 * listener that targets it, the built update is dispatched through the genuine
 * engine, and we assert it routed to the matching handler with the expected
 * rich event type.
 */
import { Injectable } from '@nestjs/common';

import { OnChannelPost } from '../decorators/listeners/on-channel-post.decorator';
import { OnChatJoinRequest } from '../decorators/listeners/on-chat-join-request.decorator';
import { OnChatMember } from '../decorators/listeners/on-chat-member.decorator';
import { OnEditedChannelPost } from '../decorators/listeners/on-edited-channel-post.decorator';
import { OnEditedMessage } from '../decorators/listeners/on-edited-message.decorator';
import { OnMyChatMember } from '../decorators/listeners/on-my-chat-member.decorator';
import { OnPhoto } from '../decorators/listeners/content.decorators';
import { OnPoll } from '../decorators/listeners/on-poll.decorator';
import { OnPollAnswer } from '../decorators/listeners/on-poll-answer.decorator';
import { OnPreCheckoutQuery } from '../decorators/listeners/on-pre-checkout-query.decorator';
import { OnMessageReaction } from '../decorators/listeners/on-message-reaction.decorator';
import { OnShippingQuery } from '../decorators/listeners/on-shipping-query.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { ChatJoinRequest } from '../events/chat-join-request';
import { ChatMemberUpdated } from '../events/chat-member-updated';
import { Message } from '../events/message';
import { MessageReactionUpdated } from '../events/message-reaction-updated';
import { Poll } from '../events/poll';
import { PollAnswer } from '../events/poll-answer';
import { PreCheckoutQuery } from '../events/pre-checkout-query';
import { ShippingQuery } from '../events/shipping-query';
import { NestgramTestbed } from './nestgram-testbed';
import { updates, UpdateFactory } from './update-factory';

/** Collects the rich events each handler receives, so a test can assert routing. */
@Injectable()
class EventSink {
  readonly events: unknown[] = [];

  record(event: unknown): void {
    this.events.push(event);
  }
}

@Router()
class KindsRouter {
  constructor(private readonly sink: EventSink) {}

  @OnEditedMessage()
  editedMessage(message: Message): void {
    this.sink.record(message);
  }

  @OnChannelPost()
  channelPost(message: Message): void {
    this.sink.record(message);
  }

  @OnEditedChannelPost()
  editedChannelPost(message: Message): void {
    this.sink.record(message);
  }

  @OnPhoto()
  photo(message: Message): void {
    this.sink.record(message);
  }

  @OnMyChatMember()
  myChatMember(update: ChatMemberUpdated): void {
    this.sink.record(update);
  }

  @OnChatMember()
  chatMember(update: ChatMemberUpdated): void {
    this.sink.record(update);
  }

  @OnChatJoinRequest()
  chatJoinRequest(request: ChatJoinRequest): void {
    this.sink.record(request);
  }

  @OnPreCheckoutQuery()
  preCheckout(query: PreCheckoutQuery): void {
    this.sink.record(query);
  }

  @OnShippingQuery()
  shipping(query: ShippingQuery): void {
    this.sink.record(query);
  }

  @OnPoll()
  poll(poll: Poll): void {
    this.sink.record(poll);
  }

  @OnPollAnswer()
  pollAnswer(answer: PollAnswer): void {
    this.sink.record(answer);
  }

  @OnMessageReaction()
  reaction(reaction: MessageReactionUpdated): void {
    this.sink.record(reaction);
  }
}

describe('UpdateFactory — routable-kind builders', () => {
  let bot: NestgramTestbed;
  let sink: EventSink;

  beforeEach(async () => {
    sink = new EventSink();
    bot = await NestgramTestbed.create({
      routers: [KindsRouter],
      providers: [{ provide: EventSink, useValue: sink }],
    });
  });

  afterEach(async () => {
    await bot.close();
  });

  it('editedMessage() routes to @OnEditedMessage as a Message', async () => {
    await bot.dispatch(updates.editedMessage('fixed typo'));

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toBeInstanceOf(Message);
    expect((sink.events[0] as Message).text).toBe('fixed typo');
  });

  it('channelPost() routes to @OnChannelPost in a channel chat', async () => {
    await bot.dispatch(updates.channelPost('news'));

    expect(sink.events[0]).toBeInstanceOf(Message);
    expect((sink.events[0] as Message).chat.type).toBe('channel');
    expect((sink.events[0] as Message).from).toBeUndefined();
  });

  it('editedChannelPost() routes to @OnEditedChannelPost', async () => {
    await bot.dispatch(updates.editedChannelPost('edited news'));

    expect(sink.events[0]).toBeInstanceOf(Message);
    expect((sink.events[0] as Message).text).toBe('edited news');
  });

  it('photo() routes to @OnPhoto with a photo and optional caption', async () => {
    await bot.dispatch(updates.photo('look at this'));

    const message = sink.events[0] as Message;
    expect(message).toBeInstanceOf(Message);
    expect(message.photo).toBeDefined();
    expect(message.caption).toBe('look at this');
  });

  it('myChatMember() routes to @OnMyChatMember as ChatMemberUpdated', async () => {
    await bot.dispatch(updates.myChatMember());

    expect(sink.events[0]).toBeInstanceOf(ChatMemberUpdated);
    expect((sink.events[0] as ChatMemberUpdated).new_chat_member.status).toBe(
      'member',
    );
  });

  it('chatMember() routes to @OnChatMember as ChatMemberUpdated', async () => {
    await bot.dispatch(updates.chatMember());

    expect(sink.events[0]).toBeInstanceOf(ChatMemberUpdated);
  });

  it('chatJoinRequest() routes to @OnChatJoinRequest', async () => {
    await bot.dispatch(updates.chatJoinRequest());

    expect(sink.events[0]).toBeInstanceOf(ChatJoinRequest);
  });

  it('preCheckoutQuery() routes to @OnPreCheckoutQuery', async () => {
    await bot.dispatch(updates.preCheckoutQuery('order_42'));

    expect(sink.events[0]).toBeInstanceOf(PreCheckoutQuery);
    expect((sink.events[0] as PreCheckoutQuery).invoice_payload).toBe(
      'order_42',
    );
  });

  it('shippingQuery() routes to @OnShippingQuery', async () => {
    await bot.dispatch(updates.shippingQuery('order_42'));

    expect(sink.events[0]).toBeInstanceOf(ShippingQuery);
    expect((sink.events[0] as ShippingQuery).invoice_payload).toBe('order_42');
  });

  it('poll() routes to @OnPoll', async () => {
    await bot.dispatch(updates.poll('Coffee or tea?'));

    expect(sink.events[0]).toBeInstanceOf(Poll);
    expect((sink.events[0] as Poll).question).toBe('Coffee or tea?');
  });

  it('pollAnswer() routes to @OnPollAnswer', async () => {
    await bot.dispatch(updates.pollAnswer([1]));

    expect(sink.events[0]).toBeInstanceOf(PollAnswer);
    expect((sink.events[0] as PollAnswer).option_ids).toEqual([1]);
  });

  it('messageReaction() routes to @OnMessageReaction', async () => {
    await bot.dispatch(updates.messageReaction('👍'));

    expect(sink.events[0]).toBeInstanceOf(MessageReactionUpdated);
    expect((sink.events[0] as MessageReactionUpdated).new_reaction).toEqual([
      { type: 'emoji', emoji: '👍' },
    ]);
  });

  it('raw() fills update_id and dispatches a hand-built kind', async () => {
    // The escape hatch: a poll_answer assembled by hand, routed through raw().
    await bot.dispatch(
      updates.raw({
        poll_answer: {
          poll_id: 'hand_built',
          option_ids: [0],
          option_persistent_ids: ['opt_0'],
        },
      }),
    );

    expect(sink.events[0]).toBeInstanceOf(PollAnswer);
    expect((sink.events[0] as PollAnswer).poll_id).toBe('hand_built');
  });
});

describe('UpdateFactory — raw() id handling', () => {
  it('auto-increments update_id when absent', () => {
    const factory = new UpdateFactory();
    const a = factory.raw({
      poll_answer: { poll_id: 'p', option_ids: [], option_persistent_ids: [] },
    });
    const b = factory.raw({
      poll_answer: { poll_id: 'p', option_ids: [], option_persistent_ids: [] },
    });

    expect(b.update_id).toBe(a.update_id + 1);
  });

  it('keeps an explicit update_id', () => {
    const factory = new UpdateFactory();
    const update = factory.raw({
      update_id: 555,
      poll_answer: { poll_id: 'p', option_ids: [], option_persistent_ids: [] },
    });

    expect(update.update_id).toBe(555);
  });
});
