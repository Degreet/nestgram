import { deepLinkData } from './deep-link-data';
import { DeepLinkDataPredicate } from './deep-link-data.predicate';
import { TelegramExecutionContext } from '../engine/context';

function ctx(text?: string): TelegramExecutionContext {
  return {
    update: { message: text === undefined ? {} : { text } },
  } as unknown as TelegramExecutionContext;
}

describe('deepLinkData().filter() predicate', () => {
  const Ref = deepLinkData('ref', { userId: Number });

  it('matches a command whose payload is the definition', () => {
    expect(Ref.filter().matches(ctx('/start ref_42'))).toBe(true);
  });

  it('does not match a different payload', () => {
    expect(Ref.filter().matches(ctx('/start other_1'))).toBe(false);
  });

  it('does not match a command with no payload', () => {
    expect(Ref.filter().matches(ctx('/start'))).toBe(false);
  });

  it('does not match a non-message update', () => {
    expect(Ref.filter().matches(ctx())).toBe(false);
  });

  it('returns a DeepLinkDataPredicate', () => {
    expect(Ref.filter()).toBeInstanceOf(DeepLinkDataPredicate);
  });
});
