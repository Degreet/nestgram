import { MediaGroup } from './media-group';
import { InputFile } from './input-file';

describe('MediaGroup builder', () => {
  it('accumulates typed items with their tag and options', () => {
    const group = new MediaGroup()
      .photo('p_id', { caption: 'A' })
      .video('v_id', { has_spoiler: true });

    expect(group.size).toBe(2);
    expect(group.toJSON()).toEqual([
      { type: 'photo', media: 'p_id', caption: 'A' },
      { type: 'video', media: 'v_id', has_spoiler: true },
    ]);
  });

  it('supports audio and document items', () => {
    const group = new MediaGroup()
      .audio('a_id', { performer: 'X' })
      .document('d_id');

    expect(group.toJSON()).toEqual([
      { type: 'audio', media: 'a_id', performer: 'X' },
      { type: 'document', media: 'd_id' },
    ]);
  });

  it('carries an InputFile through as the media source', () => {
    const file = new InputFile('cat.jpg');
    const group = new MediaGroup().photo(file);
    expect(group.toJSON()[0].media).toBe(file);
  });

  it('add() appends pre-built items', () => {
    const group = new MediaGroup()
      .photo('p1')
      .add({ type: 'photo', media: 'p2' }, { type: 'video', media: 'v1' });

    expect(group.toJSON().map((i) => i.media)).toEqual(['p1', 'p2', 'v1']);
  });

  it('each() appends one item per source value', () => {
    const urls = ['u1', 'u2', 'u3'];
    const group = new MediaGroup().each(urls, (g, url) => g.photo(url));

    expect(group.size).toBe(3);
    expect(group.toJSON().map((i) => i.media)).toEqual(urls);
  });

  it('toJSON() returns a snapshot that does not alias the internal array', () => {
    const group = new MediaGroup().photo('p1');
    const snapshot = group.toJSON();
    snapshot.push({ type: 'photo', media: 'rogue' });
    expect(group.size).toBe(1);
  });
});
