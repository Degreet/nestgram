import { Router, Command, OnText, Message } from 'nestgram';

/**
 * Stands in for an LLM's streaming response: yields the reply a few tokens at a
 * time with a small delay, so the draft visibly animates. A real provider's
 * streaming API is already an `AsyncIterable<string>` of deltas — drop it in
 * here unchanged.
 */
async function* fakeCompletion(prompt: string): AsyncIterable<string> {
  const reply =
    `You said: **${prompt}**\n\n` +
    'Here is a streamed answer, arriving a few tokens at a time — the draft ' +
    'animates in place until it finalizes into a real message.';
  for (const token of reply.match(/\S+\s*/g) ?? []) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    yield token;
  }
}

/**
 * A tiny streaming assistant. `/ask <text>` returns the stream directly (the
 * framework detects the async iterable and streams it); any other text message
 * is answered imperatively with `message.answerStream(...)`.
 *
 * Streaming is private-chat only — DM the bot. In a group `answerStream` throws
 * (catch it to fall back to `answer`), and a bare `return <stream>` is dropped.
 */
@Router()
export class AssistantRouter {
  @Command('ask')
  ask(message: Message) {
    return fakeCompletion(message.text ?? '');
  }

  @OnText()
  chat(message: Message) {
    return message.answerStream(fakeCompletion(message.text ?? ''));
  }
}
