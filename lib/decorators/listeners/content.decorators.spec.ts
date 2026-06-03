import 'reflect-metadata';

import { OnPhoto, OnTextOrCaption, OnMedia } from './content.decorators';
import { Metadata } from '../metadata.enum';
import { ListenerOptions } from '../listener-options';
import { ContentTypePredicate } from '../../engine/matching';
import { TelegramExecutionContext } from '../../engine/context';

function listenersOf(fn: unknown): ListenerOptions[] {
  return Reflect.getMetadata(Metadata.LISTENERS, fn as object) ?? [];
}

function ctx(message: unknown): TelegramExecutionContext {
  return { update: { message } } as unknown as TelegramExecutionContext;
}

describe('content listeners', () => {
  it('@OnPhoto registers a message listener whose predicate matches a photo', () => {
    class Router {
      handle(): void {
        return;
      }
    }
    OnPhoto()(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const [listener] = listenersOf(Router.prototype.handle);
    expect(listener.updateType).toBe('message');

    const predicate = listener.predicates?.[0];
    expect(predicate).toBeInstanceOf(ContentTypePredicate);
    expect(predicate?.matches(ctx({ photo: [{ file_id: 'x' }] }))).toBe(true);
    expect(predicate?.matches(ctx({ text: 'hi' }))).toBe(false);
  });

  it('@OnTextOrCaption matches either text or caption', () => {
    class Router {
      handle(): void {
        return;
      }
    }
    OnTextOrCaption()(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const predicate = listenersOf(Router.prototype.handle)[0].predicates?.[0];
    expect(predicate?.matches(ctx({ text: 'hi' }))).toBe(true);
    expect(predicate?.matches(ctx({ caption: 'hi' }))).toBe(true);
    expect(predicate?.matches(ctx({ photo: [{ file_id: 'x' }] }))).toBe(false);
  });

  it('@OnMedia matches any downloadable media but not plain text', () => {
    class Router {
      handle(): void {
        return;
      }
    }
    OnMedia()(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const predicate = listenersOf(Router.prototype.handle)[0].predicates?.[0];
    expect(predicate?.matches(ctx({ video: { file_id: 'x' } }))).toBe(true);
    expect(predicate?.matches(ctx({ voice: { file_id: 'x' } }))).toBe(true);
    expect(predicate?.matches(ctx({ text: 'hi' }))).toBe(false);
  });
});
