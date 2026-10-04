import { stripQueryAndFragment, toAbsoluteUrl } from './url';

describe('toAbsoluteUrl', () => {
  const base = 'https://example.com';

  it.each([
    ['/a/b', 'https://example.com/a/b'],
    ['a/b', 'https://example.com/a/b'],
    ['https://cdn.example.org/x.jpg', 'https://cdn.example.org/x.jpg'],
    ['http://example.com/x', 'http://example.com/x'],
  ])('resolves %s', (input, expected) => {
    expect(toAbsoluteUrl(input, base)).toBe(expected);
  });

  it.each(['javascript:alert(1)', 'data:text/plain,hi', 'mailto:a@example.com', 'http://'])(
    'rejects %s',
    (input) => {
      expect(toAbsoluteUrl(input, base)).toBeNull();
    },
  );
});

describe('stripQueryAndFragment', () => {
  it.each([
    ['/a?x=1#top', '/a'],
    ['/a#top', '/a'],
    ['/a?x=1', '/a'],
    ['/a', '/a'],
  ])('%s -> %s', (input, expected) => {
    expect(stripQueryAndFragment(input)).toBe(expected);
  });
});
