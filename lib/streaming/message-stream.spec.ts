import { MessageStream } from './message-stream';
import { NestgramError } from '../exceptions';
import type { BotService } from '../api';
import type { Message } from '../events';

interface DraftCall {
  chat_id: number;
  draft_id: number;
  rich_message: unknown;
  options: unknown;
}

interface FinalCall {
  chat_id: number;
  rich_message: unknown;
  options: unknown;
}

/** A fake bot recording the two rich-message calls the engine makes. */
function fakeBot() {
  const drafts: DraftCall[] = [];
  const finals: FinalCall[] = [];
  const sent = { message_id: 1 } as unknown as Message;
  const bot = {
    sendRichMessageDraft: (
      chat_id: number,
      draft_id: number,
      rich_message: unknown,
      options: unknown,
    ) => {
      drafts.push({ chat_id, draft_id, rich_message, options });
      return Promise.resolve(true);
    },
    sendRichMessage: (
      chat_id: number,
      rich_message: unknown,
      options: unknown,
    ) => {
      finals.push({ chat_id, rich_message, options });
      return Promise.resolve(sent);
    },
  } as unknown as BotService;
  return { bot, drafts, finals, sent };
}

async function* gen(deltas: string[]): AsyncGenerator<string> {
  for (const delta of deltas) {
    yield delta;
  }
}

async function* throwingGen(deltas: string[]): AsyncGenerator<string> {
  for (const delta of deltas) {
    yield delta;
  }
  throw new Error('boom');
}

// A private chat id — the hub (`bot.streamMessage`) guards this; the engine
// itself assumes it and just streams.
const CHAT = 111;

describe('MessageStream', () => {
  it('accumulates deltas and persists the full text', async () => {
    const { bot, drafts, finals, sent } = fakeBot();

    const result = await new MessageStream(
      bot,
      CHAT,
      gen(['Hel', 'lo ', 'world']),
      { throttleMs: 0 },
    ).run();

    expect(drafts.map((d) => d.rich_message)).toEqual([
      { markdown: 'Hel' },
      { markdown: 'Hello ' },
      { markdown: 'Hello world' },
    ]);
    expect(finals).toHaveLength(1);
    expect(finals[0]).toMatchObject({
      chat_id: CHAT,
      rich_message: { markdown: 'Hello world' },
    });
    expect(result).toBe(sent);
  });

  it('coalesces to the latest text within a throttle window', async () => {
    const { bot, drafts, finals } = fakeBot();

    await new MessageStream(bot, CHAT, gen(['a', 'b', 'c']), {
      throttleMs: 100_000,
    }).run();

    // Only the first frame pushes; the rest fold into the finalize — the final
    // message still carries the whole text.
    expect(drafts).toHaveLength(1);
    expect(drafts[0].rich_message).toEqual({ markdown: 'a' });
    expect(finals[0].rich_message).toEqual({ markdown: 'abc' });
  });

  it('animates the first real delta even after a leading empty chunk', async () => {
    const { bot, drafts, finals } = fakeBot();

    // LLM streams often open with an empty content delta; it must not spend the
    // throttle window and swallow the first visible frame.
    await new MessageStream(bot, CHAT, gen(['', 'hi']), {
      throttleMs: 100_000,
    }).run();

    expect(drafts).toHaveLength(1);
    expect(drafts[0].rich_message).toEqual({ markdown: 'hi' });
    expect(finals[0].rich_message).toEqual({ markdown: 'hi' });
  });

  it('animates every frame under a single draft id', async () => {
    const { bot, drafts } = fakeBot();

    await new MessageStream(bot, CHAT, gen(['a', 'b']), {
      throttleMs: 0,
    }).run();

    expect(new Set(drafts.map((d) => d.draft_id)).size).toBe(1);
  });

  it('gives each stream its own draft id', async () => {
    const { bot, drafts } = fakeBot();

    await new MessageStream(bot, CHAT, gen(['a']), { throttleMs: 0 }).run();
    await new MessageStream(bot, CHAT, gen(['b']), { throttleMs: 0 }).run();

    expect(drafts[0].draft_id).not.toBe(drafts[1].draft_id);
  });

  it('sends nothing and resolves undefined for an empty stream', async () => {
    const { bot, drafts, finals } = fakeBot();

    const result = await new MessageStream(bot, CHAT, gen([]), {
      throttleMs: 0,
    }).run();

    expect(drafts).toHaveLength(0);
    expect(finals).toHaveLength(0);
    expect(result).toBeUndefined();
  });

  it('aborts on a source error and persists nothing', async () => {
    const { bot, finals } = fakeBot();

    await expect(
      new MessageStream(bot, CHAT, throwingGen(['partial']), {
        throttleMs: 0,
      }).run(),
    ).rejects.toThrow('boom');

    expect(finals).toHaveLength(0);
  });

  it('refuses a non-private chat (self-enforced, not just at the hub)', async () => {
    const { bot, drafts, finals } = fakeBot();

    await expect(
      new MessageStream(bot, -100, gen(['hi']), { throttleMs: 0 }).run(),
    ).rejects.toBeInstanceOf(NestgramError);

    expect(drafts).toHaveLength(0);
    expect(finals).toHaveLength(0);
  });

  it('writes the html dialect when asked', async () => {
    const { bot, drafts, finals } = fakeBot();

    await new MessageStream(bot, CHAT, gen(['<b>hi</b>']), {
      throttleMs: 0,
      format: 'html',
    }).run();

    expect(drafts[0].rich_message).toEqual({ html: '<b>hi</b>' });
    expect(finals[0].rich_message).toEqual({ html: '<b>hi</b>' });
  });

  it('applies finalize options to the persisted message only, not the drafts', async () => {
    const { bot, drafts, finals } = fakeBot();
    const reply_markup = { inline_keyboard: [] };

    await new MessageStream(bot, CHAT, gen(['x']), {
      throttleMs: 0,
      reply_markup,
    }).run();

    expect(
      (drafts[0].options as { reply_markup?: unknown }).reply_markup,
    ).toBeUndefined();
    expect((finals[0].options as { reply_markup?: unknown }).reply_markup).toBe(
      reply_markup,
    );
  });
});
