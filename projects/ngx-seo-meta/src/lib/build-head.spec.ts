import { buildHead, HeadModel } from './build-head';
import { SeoConfig } from './config';
import { SeoMetadata } from './types';

const config: SeoConfig = { baseUrl: 'https://example.com', siteName: 'Example', titleTemplate: '%s · Example' };

const values = (head: HeadModel, key: string) =>
  head.tags.filter((tag) => tag.name === key || tag.property === key).map((tag) => tag.content);

describe('buildHead', () => {
  it('applies the title template to document title only', () => {
    const head = buildHead({ title: 'Page' }, config);
    expect(head.title).toBe('Page · Example');
    expect(values(head, 'og:title')).toEqual(['Page']);
    expect(values(head, 'twitter:title')).toEqual(['Page']);
  });

  it('keeps $ patterns in templated titles literal', () => {
    expect(buildHead({ title: 'Sale $$ off $&' }, config).title).toBe('Sale $$ off $& · Example');
  });

  it('skips the template when titleTemplate is false', () => {
    expect(buildHead({ title: 'Home', titleTemplate: false }, config).title).toBe('Home');
  });

  it('falls back to siteName without a title', () => {
    const head = buildHead({}, config);
    expect(head.title).toBe('Example');
    expect(values(head, 'og:title')).toEqual([]);
  });

  it('renders description, author, robots and site name', () => {
    const head = buildHead({ description: 'D', author: 'A', robots: 'noindex' }, config);
    expect(values(head, 'description')).toEqual(['D']);
    expect(values(head, 'og:description')).toEqual(['D']);
    expect(values(head, 'twitter:description')).toEqual(['D']);
    expect(values(head, 'author')).toEqual(['A']);
    expect(values(head, 'robots')).toEqual(['noindex']);
    expect(values(head, 'og:site_name')).toEqual(['Example']);
  });

  it('renders nothing for null values', () => {
    const head = buildHead({ description: null, robots: null, image: null, url: null }, config);
    expect(values(head, 'description')).toEqual([]);
    expect(values(head, 'robots')).toEqual([]);
    expect(values(head, 'og:image')).toEqual([]);
    expect(head.links).toEqual([]);
  });

  it('resolves url into og:url and canonical', () => {
    const head = buildHead({ url: '/a' }, config);
    expect(values(head, 'og:url')).toEqual(['https://example.com/a']);
    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://example.com/a' }]);
  });

  it('drops an invalid url and reports an issue', () => {
    const head = buildHead({ url: 'javascript:alert(1)' }, config);
    expect(head.links).toEqual([]);
    expect(values(head, 'og:url')).toEqual([]);
    expect(head.issues).toEqual([{ level: 'warn', message: expect.stringContaining('"url"') }]);
  });

  it.each<[SeoMetadata, string]>([
    [{}, 'website'],
    [{ article: {} }, 'article'],
    [{ product: { price: 1, currency: 'EUR' } }, 'product'],
    [{ type: 'profile', product: { price: 1, currency: 'EUR' } }, 'profile'],
  ])('infers og:type from %j', (metadata, expected) => {
    expect(values(buildHead(metadata, config), 'og:type')).toEqual([expected]);
  });

  it('renders an image without dimensions when they are unknown', () => {
    const head = buildHead({ image: { url: '/a.jpg' } }, config);
    expect(values(head, 'og:image')).toEqual(['https://example.com/a.jpg']);
    expect(values(head, 'og:image:width')).toEqual([]);
    expect(values(head, 'twitter:image')).toEqual(['https://example.com/a.jpg']);
    expect(values(head, 'twitter:card')).toEqual(['summary_large_image']);
  });

  it('renders no image tags for an empty image url', () => {
    const head = buildHead({ image: '' }, config);
    expect(values(head, 'og:image')).toEqual([]);
    expect(values(head, 'twitter:card')).toEqual(['summary']);
    expect(head.issues).toEqual([]);
  });

  it('renders full image data', () => {
    const head = buildHead({ image: { url: '/a.jpg', alt: 'A', width: 1200, height: 630 } }, config);
    expect(values(head, 'og:image:alt')).toEqual(['A']);
    expect(values(head, 'og:image:width')).toEqual(['1200']);
    expect(values(head, 'og:image:height')).toEqual(['630']);
    expect(values(head, 'twitter:image:alt')).toEqual(['A']);
  });

  it('uses the summary card without an image', () => {
    expect(values(buildHead({}, config), 'twitter:card')).toEqual(['summary']);
  });

  it('renders twitter site, creator and explicit card', () => {
    const head = buildHead({ image: '/a.jpg', twitter: { card: 'summary', site: '@s', creator: '@c' } }, config);
    expect(values(head, 'twitter:card')).toEqual(['summary']);
    expect(values(head, 'twitter:site')).toEqual(['@s']);
    expect(values(head, 'twitter:creator')).toEqual(['@c']);
  });

  it('renders article tags with repeated keys', () => {
    const head = buildHead(
      {
        article: {
          publishedTime: '2026-01-01T00:00:00Z',
          modifiedTime: '2026-01-02T00:00:00Z',
          authors: ['Ann', 'Bob'],
          section: 'Radio',
          tags: ['vhf', 'uhf'],
        },
      },
      config,
    );
    expect(values(head, 'article:published_time')).toEqual(['2026-01-01T00:00:00Z']);
    expect(values(head, 'article:modified_time')).toEqual(['2026-01-02T00:00:00Z']);
    expect(values(head, 'article:author')).toEqual(['Ann', 'Bob']);
    expect(values(head, 'article:section')).toEqual(['Radio']);
    expect(values(head, 'article:tag')).toEqual(['vhf', 'uhf']);
  });

  it('renders product tags', () => {
    const head = buildHead({ product: { price: 249, currency: 'PLN', availability: 'in stock' } }, config);
    expect(values(head, 'product:price:amount')).toEqual(['249.00']);
    expect(values(head, 'product:price:currency')).toEqual(['PLN']);
    expect(values(head, 'product:availability')).toEqual(['in stock']);
  });

  it('accepts a numeric string price', () => {
    const head = buildHead({ product: { price: '249' as unknown as number, currency: 'PLN' } }, config);
    expect(values(head, 'product:price:amount')).toEqual(['249.00']);
    expect(head.issues).toEqual([]);
  });

  it('skips and reports a non-numeric price', () => {
    const head = buildHead({ product: { price: 'abc' as unknown as number, currency: 'PLN' } }, config);
    expect(values(head, 'product:price:amount')).toEqual([]);
    expect(values(head, 'product:price:currency')).toEqual(['PLN']);
    expect(head.issues).toEqual([{ level: 'warn', message: expect.stringContaining('price') }]);
  });

  it('renders locale, locale alternates and hreflang links', () => {
    const head = buildHead(
      {
        locale: 'pl_PL',
        localeAlternates: ['en_US', 'de_DE'],
        alternates: [
          { hreflang: 'en', url: '/en' },
          { hreflang: 'x-default', url: 'https://example.com/' },
        ],
      },
      config,
    );
    expect(values(head, 'og:locale')).toEqual(['pl_PL']);
    expect(values(head, 'og:locale:alternate')).toEqual(['en_US', 'de_DE']);
    expect(head.links).toEqual([
      { rel: 'alternate', hreflang: 'en', href: 'https://example.com/en' },
      { rel: 'alternate', hreflang: 'x-default', href: 'https://example.com/' },
    ]);
  });

  it('serializes each JSON-LD item and reports unserializable ones', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const head = buildHead({ jsonLd: [{ '@type': 'Organization' }, cyclic] }, config);
    expect(head.jsonLd).toEqual(['{"@type":"Organization"}']);
    expect(head.issues).toEqual([{ level: 'error', message: expect.stringContaining('JSON-LD') }]);
  });

  it('appends extra tags as given', () => {
    const head = buildHead({ extraTags: [{ name: 'theme-color', content: '#000' }] }, config);
    expect(head.tags.at(-1)).toEqual({ name: 'theme-color', content: '#000' });
  });

  it('drops extra tags with invalid attribute names', () => {
    const head = buildHead(
      { extraTags: [{ name: 'ok', content: '1' }, { 'bad name': 'x', content: '2' }] },
      config,
    );
    expect(head.tags.at(-1)).toEqual({ name: 'ok', content: '1' });
    expect(head.tags.filter((tag) => tag['content'] === '2')).toEqual([]);
    expect(head.issues).toEqual([{ level: 'warn', message: expect.stringContaining('invalid attribute name') }]);
  });

  it('accepts httpEquiv in extra tags', () => {
    const head = buildHead({ extraTags: [{ httpEquiv: 'refresh', content: '30' }] }, config);
    expect(head.tags.at(-1)).toEqual({ httpEquiv: 'refresh', content: '30' });
    expect(head.issues).toEqual([]);
  });
});
