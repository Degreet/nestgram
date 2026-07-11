// The engine (MessageStream) is internal — reached only through
// `bot.streamMessage(...)`, which guards the private-chat invariant. The public
// surface is the option/source types a handler annotates with.
export * from './stream.types';
