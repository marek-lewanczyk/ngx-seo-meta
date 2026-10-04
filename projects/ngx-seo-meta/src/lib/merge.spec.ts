import { mergeMetadata, normalizeImage, toArray } from './merge';
import { SeoMetadata } from './types';

describe('mergeMetadata', () => {
  it('lets the page override scalar fields', () => {
    expect(mergeMetadata({ description: 'a', robots: 'index' }, { description: 'b' }, 'concat')).toEqual({
      description: 'b',
      robots: 'index',
    });
  });

  it('ignores undefined values in the override', () => {
    expect(mergeMetadata({ description: 'a' }, { description: undefined }, 'concat')).toEqual({
      description: 'a',
    });
  });

  it('clears a value with null', () => {
    expect(mergeMetadata({ description: 'a' }, { description: null }, 'concat')).toEqual({ description: null });
  });

  it('normalizes a string image and replaces the default image entirely', () => {
    const base: SeoMetadata = { image: { url: '/default.jpg', alt: 'Default', width: 1200, height: 630 } };
    expect(mergeMetadata(base, { image: '/page.jpg' }, 'concat')).toEqual({ image: { url: '/page.jpg' } });
  });

  it('normalizes a string image coming from the base', () => {
    expect(mergeMetadata({ image: '/default.jpg' }, {}, 'concat')).toEqual({ image: { url: '/default.jpg' } });
  });

  it('merges twitter, article and product one level deep', () => {
    const result = mergeMetadata(
      { twitter: { site: '@site' }, product: { price: 1, currency: 'EUR' } },
      { twitter: { creator: '@me', site: undefined }, product: { price: 2, currency: 'EUR', availability: 'in stock' } },
      'concat',
    );
    expect(result.twitter).toEqual({ site: '@site', creator: '@me' });
    expect(result.product).toEqual({ price: 2, currency: 'EUR', availability: 'in stock' });
  });

  it('concatenates jsonLd in concat mode', () => {
    const org = { '@type': 'Organization' };
    const product = { '@type': 'Product' };
    expect(mergeMetadata({ jsonLd: org }, { jsonLd: product }, 'concat').jsonLd).toEqual([org, product]);
  });

  it('replaces jsonLd in replace mode', () => {
    const product = { '@type': 'Product' };
    expect(mergeMetadata({ jsonLd: { '@type': 'Organization' } }, { jsonLd: product }, 'replace').jsonLd).toBe(product);
  });

  it('clears jsonLd with null in concat mode', () => {
    expect(mergeMetadata({ jsonLd: { '@type': 'Organization' } }, { jsonLd: null }, 'concat').jsonLd).toBeNull();
  });

  it('does not mutate its inputs', () => {
    const base: SeoMetadata = { twitter: { site: '@site' } };
    const over: SeoMetadata = { twitter: { creator: '@me' } };
    mergeMetadata(base, over, 'concat');
    expect(base).toEqual({ twitter: { site: '@site' } });
    expect(over).toEqual({ twitter: { creator: '@me' } });
  });
});

describe('toArray', () => {
  it.each<[unknown, unknown[]]>([
    [undefined, []],
    [null, []],
    [1, [1]],
    [[1, 2], [1, 2]],
  ])('%j -> %j', (input, expected) => {
    expect(toArray(input)).toEqual(expected);
  });
});

describe('normalizeImage', () => {
  it('wraps a string', () => expect(normalizeImage('/a.jpg')).toEqual({ url: '/a.jpg' }));
  it('keeps an object', () => expect(normalizeImage({ url: '/a.jpg', alt: 'A' })).toEqual({ url: '/a.jpg', alt: 'A' }));
  it('keeps null and undefined', () => {
    expect(normalizeImage(null)).toBeNull();
    expect(normalizeImage(undefined)).toBeUndefined();
  });
});
