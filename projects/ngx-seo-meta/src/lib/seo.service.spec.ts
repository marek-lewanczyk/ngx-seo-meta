import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { provideSeo, SeoConfig } from './config';
import { SeoService } from './seo.service';

const config: SeoConfig = {
  baseUrl: 'https://example.com',
  siteName: 'Example',
  titleTemplate: '%s · Example',
  defaults: {
    description: 'Default description',
    image: { url: '/og.jpg', alt: 'Default image', width: 1200, height: 630 },
    jsonLd: { '@type': 'Organization', name: 'Example' },
  },
};

describe('SeoService', () => {
  let document: Document;

  const content = (key: string) =>
    document.head.querySelector<HTMLMetaElement>(`meta[name="${key}"], meta[property="${key}"]`)?.content ?? null;
  const jsonLdTypes = () =>
    Array.from(document.head.querySelectorAll('script[type="application/ld+json"]')).map(
      (el) => JSON.parse(el.textContent ?? '{}')['@type'],
    );

  function setup(withConfig = true): SeoService {
    TestBed.configureTestingModule({ providers: withConfig ? [provideSeo(config)] : [] });
    document = TestBed.inject(DOCUMENT);
    return TestBed.inject(SeoService);
  }

  afterEach(() => {
    document?.head.querySelectorAll('meta, link, script').forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it('throws a helpful error without provideSeo()', () => {
    expect(() => setup(false)).toThrowError(/provideSeo\(\)/);
  });

  it('renders page metadata on top of defaults', () => {
    setup().update({ title: 'Page', url: '/page' });

    expect(document.title).toBe('Page · Example');
    expect(content('description')).toBe('Default description');
    expect(content('og:image')).toBe('https://example.com/og.jpg');
    expect(content('og:url')).toBe('https://example.com/page');
  });

  it('replaces the previous page on update', () => {
    const seo = setup();
    seo.update({ title: 'A', description: 'Page A', product: { price: 1, currency: 'EUR' } });
    seo.update({ title: 'B' });

    expect(content('description')).toBe('Default description');
    expect(content('product:price:amount')).toBeNull();
    expect(content('og:type')).toBe('website');
  });

  it('merges into the current page on patch', () => {
    const seo = setup();
    seo.update({ title: 'A', description: 'Page A' });
    seo.patch({ image: { url: '/a.jpg', alt: 'A' } });

    expect(document.title).toBe('A · Example');
    expect(content('description')).toBe('Page A');
    expect(content('og:image')).toBe('https://example.com/a.jpg');
    expect(content('og:image:width')).toBeNull();
  });

  it('clears a default with null', () => {
    setup().update({ title: 'A', image: null });

    expect(content('og:image')).toBeNull();
    expect(content('twitter:card')).toBe('summary');
  });

  it('combines default and page JSON-LD; patch replaces page JSON-LD', () => {
    const seo = setup();
    seo.update({ jsonLd: { '@type': 'Product' } });
    expect(jsonLdTypes()).toEqual(['Organization', 'Product']);

    seo.patch({ jsonLd: { '@type': 'Article' } });
    expect(jsonLdTypes()).toEqual(['Organization', 'Article']);
  });

  it('reports issues and quality hints in dev mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setup().update({ title: 'x'.repeat(61), url: 'javascript:alert(1)' });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"url"'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Title'));
  });
});
