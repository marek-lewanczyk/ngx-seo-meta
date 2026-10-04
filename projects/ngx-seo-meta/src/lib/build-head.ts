import { MetaDefinition } from '@angular/platform-browser';

import { SeoConfig } from './config';
import { serializeJsonLd } from './json-ld';
import { normalizeImage, toArray } from './merge';
import { SeoMetadata } from './types';
import { toAbsoluteUrl } from './url';

export interface HeadLink {
  readonly rel: 'canonical' | 'alternate';
  readonly href: string;
  readonly hreflang?: string;
}

export interface HeadIssue {
  readonly level: 'warn' | 'error';
  readonly message: string;
}

/** Everything the library writes into `<head>` for one page. */
export interface HeadModel {
  readonly title: string;
  readonly tags: MetaDefinition[];
  readonly links: HeadLink[];
  readonly jsonLd: string[];
  readonly issues: HeadIssue[];
}

/** Computes the head for already merged metadata. Pure: no DOM access. */
export function buildHead(metadata: SeoMetadata, config: SeoConfig): HeadModel {
  const tags: MetaDefinition[] = [];
  const links: HeadLink[] = [];
  const issues: HeadIssue[] = [];

  const name = (key: string, content: string | null | undefined) => {
    if (content) tags.push({ name: key, content });
  };
  const property = (key: string, content: string | null | undefined) => {
    if (content) tags.push({ property: key, content });
  };
  const absolute = (value: string, field: string) => {
    const url = toAbsoluteUrl(value, config.baseUrl);
    if (!url) {
      issues.push({ level: 'warn', message: `Ignored invalid or non-http(s) URL in "${field}": ${value}` });
    }
    return url;
  };

  // ── Title and basic tags ────────────────────────────────────────────────────
  const rawTitle = metadata.title ?? undefined;
  const title = !rawTitle
    ? config.siteName
    : metadata.titleTemplate !== false && config.titleTemplate
      ? config.titleTemplate.replace('%s', rawTitle)
      : rawTitle;

  name('description', metadata.description);
  name('author', metadata.author);
  name('robots', metadata.robots);

  // ── Open Graph ──────────────────────────────────────────────────────────────
  property('og:type', metadata.type ?? (metadata.product ? 'product' : metadata.article ? 'article' : 'website'));
  property('og:site_name', config.siteName);
  property('og:title', rawTitle);
  property('og:description', metadata.description);

  const url = metadata.url ? absolute(metadata.url, 'url') : null;
  if (url) {
    property('og:url', url);
    links.push({ rel: 'canonical', href: url });
  }

  property('og:locale', metadata.locale);
  for (const locale of toArray(metadata.localeAlternates)) {
    property('og:locale:alternate', locale);
  }

  const image = normalizeImage(metadata.image);
  const imageUrl = image ? absolute(image.url, 'image') : null;
  if (image && imageUrl) {
    property('og:image', imageUrl);
    property('og:image:alt', image.alt);
    property('og:image:width', image.width?.toString());
    property('og:image:height', image.height?.toString());
  }

  const article = metadata.article;
  if (article) {
    property('article:published_time', article.publishedTime);
    property('article:modified_time', article.modifiedTime);
    for (const author of toArray(article.authors)) property('article:author', author);
    property('article:section', article.section);
    for (const tag of toArray(article.tags)) property('article:tag', tag);
  }

  const product = metadata.product;
  if (product) {
    property('product:price:amount', product.price.toFixed(2));
    property('product:price:currency', product.currency);
    property('product:availability', product.availability);
  }

  // ── Twitter / X ─────────────────────────────────────────────────────────────
  name('twitter:card', metadata.twitter?.card ?? (imageUrl ? 'summary_large_image' : 'summary'));
  name('twitter:site', metadata.twitter?.site);
  name('twitter:creator', metadata.twitter?.creator);
  name('twitter:title', rawTitle);
  name('twitter:description', metadata.description);
  if (image && imageUrl) {
    name('twitter:image', imageUrl);
    name('twitter:image:alt', image.alt);
  }

  // ── Links, JSON-LD, extra tags ──────────────────────────────────────────────
  for (const alternate of toArray(metadata.alternates)) {
    const href = absolute(alternate.url, 'alternates');
    if (href) links.push({ rel: 'alternate', hreflang: alternate.hreflang, href });
  }

  const jsonLd: string[] = [];
  for (const item of toArray(metadata.jsonLd)) {
    const serialized = serializeJsonLd(item);
    if (serialized === null) {
      issues.push({ level: 'error', message: 'Skipped a JSON-LD item that cannot be serialized (cycle or BigInt).' });
    } else {
      jsonLd.push(serialized);
    }
  }

  tags.push(...toArray(metadata.extraTags));

  return { title, tags, links, jsonLd, issues };
}
