import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { HeadModel } from './build-head';
import { HeadWriter, SEO_MARKER } from './head-writer';

describe('HeadWriter', () => {
  let writer: HeadWriter;
  let document: Document;

  const model = (head: Partial<HeadModel>): HeadModel => ({
    title: 'Title',
    tags: [],
    links: [],
    jsonLd: [],
    issues: [],
    ...head,
  });
  const contents = (selector: string) =>
    Array.from(document.head.querySelectorAll<HTMLMetaElement>(selector)).map((el) => el.content);
  const addRaw = (html: string) => document.head.insertAdjacentHTML('beforeend', html);

  beforeEach(() => {
    writer = TestBed.inject(HeadWriter);
    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    document.head.querySelectorAll('meta, link, script').forEach((el) => el.remove());
  });

  it('sets the title and marked meta tags', () => {
    writer.write(model({ title: 'Page', tags: [{ name: 'description', content: 'D' }, { property: 'og:type', content: 'website' }] }));

    expect(document.title).toBe('Page');
    expect(contents(`meta[name="description"][${SEO_MARKER}]`)).toEqual(['D']);
    expect(contents(`meta[property="og:type"][${SEO_MARKER}]`)).toEqual(['website']);
  });

  it('removes stale marked tags on the next write', () => {
    writer.write(model({ tags: [{ property: 'product:price:amount', content: '1.00' }] }));
    writer.write(model({ tags: [] }));

    expect(contents('meta[property="product:price:amount"]')).toEqual([]);
  });

  it('replaces an unmarked tag with the same key and keeps unrelated tags', () => {
    addRaw('<meta name="description" content="static"><meta name="viewport" content="width=device-width">');

    writer.write(model({ tags: [{ name: 'description', content: 'D' }] }));

    expect(contents('meta[name="description"]')).toEqual(['D']);
    expect(contents('meta[name="viewport"]')).toEqual(['width=device-width']);
  });

  it('allows repeated keys', () => {
    writer.write(model({ tags: [{ property: 'article:tag', content: 'a' }, { property: 'article:tag', content: 'b' }] }));

    expect(contents('meta[property="article:tag"]')).toEqual(['a', 'b']);
  });

  it('writes canonical and hreflang links, replacing an unmarked canonical', () => {
    addRaw('<link rel="canonical" href="https://old.example.com/">');

    writer.write(
      model({
        links: [
          { rel: 'canonical', href: 'https://example.com/a' },
          { rel: 'alternate', hreflang: 'en', href: 'https://example.com/en/a' },
        ],
      }),
    );

    const canonical = Array.from(document.head.querySelectorAll('link[rel="canonical"]')).map((el) => el.getAttribute('href'));
    expect(canonical).toEqual(['https://example.com/a']);
    expect(document.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href')).toBe('https://example.com/en/a');
  });

  it('removes the canonical link when the next page has none', () => {
    writer.write(model({ links: [{ rel: 'canonical', href: 'https://example.com/a' }] }));
    writer.write(model({ links: [] }));

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('writes JSON-LD scripts as text and leaves foreign ones alone', () => {
    addRaw('<script type="application/ld+json">{"foreign":true}</script>');

    writer.write(model({ jsonLd: ['{"a":1}', '{"b":"\\u003c/script\\u003e"}'] }));
    const ours = () => Array.from(document.head.querySelectorAll(`script[type="application/ld+json"][${SEO_MARKER}]`));

    expect(ours().map((el) => el.textContent)).toEqual(['{"a":1}', '{"b":"\\u003c/script\\u003e"}']);
    expect(document.head.querySelectorAll('script[type="application/ld+json"]').length).toBe(3);

    writer.write(model({ jsonLd: [] }));

    expect(ours()).toEqual([]);
    expect(document.head.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
  });
});
