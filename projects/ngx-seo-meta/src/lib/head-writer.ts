import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { MetaDefinition, Title } from '@angular/platform-browser';

import { HeadLink, HeadModel } from './build-head';

/** Attribute marking every element created by ngx-seo-meta. */
export const SEO_MARKER = 'data-ngx-seo';

const KEY_ATTRIBUTES = ['name', 'property', 'itemprop', 'http-equiv'] as const;

function metaKey(tag: MetaDefinition): string | null {
  for (const attribute of KEY_ATTRIBUTES) {
    const value = attribute === 'http-equiv' ? tag.httpEquiv ?? tag['http-equiv'] : tag[attribute];
    if (value) return `${attribute}:${value}`;
  }
  return null;
}

function elementMetaKey(element: Element): string | null {
  for (const attribute of KEY_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value) return `${attribute}:${value}`;
  }
  return null;
}

function linkKey(rel: string | null, hreflang: string | null | undefined): string | null {
  if (rel === 'canonical') return 'canonical';
  if (rel === 'alternate' && hreflang) return `alternate:${hreflang}`;
  return null;
}

/**
 * Writes a HeadModel into the document. Ownership lives in the DOM (`data-ngx-seo`),
 * so server-rendered tags are cleaned correctly after hydration.
 */
@Injectable({ providedIn: 'root' })
export class HeadWriter {
  private readonly document = inject(DOCUMENT);
  private readonly titleService = inject(Title);

  write(head: HeadModel): void {
    this.titleService.setTitle(head.title);
    this.writeMeta(head.tags);
    this.writeLinks(head.links);
    this.writeJsonLd(head.jsonLd);
  }

  private writeMeta(tags: MetaDefinition[]): void {
    const keys = new Set(tags.map(metaKey).filter((key): key is string => key !== null));
    this.removeWhere('meta', (el) => el.hasAttribute(SEO_MARKER) || keys.has(elementMetaKey(el) ?? ''));

    for (const tag of tags) {
      const element = this.document.createElement('meta');
      for (const [attribute, value] of Object.entries(tag)) {
        if (value !== undefined) {
          element.setAttribute(attribute === 'httpEquiv' ? 'http-equiv' : attribute, value);
        }
      }
      this.append(element);
    }
  }

  private writeLinks(links: HeadLink[]): void {
    const keys = new Set(links.map((link) => linkKey(link.rel, link.hreflang)).filter((key): key is string => key !== null));
    this.removeWhere(
      'link',
      (el) => el.hasAttribute(SEO_MARKER) || keys.has(linkKey(el.getAttribute('rel'), el.getAttribute('hreflang')) ?? ''),
    );

    for (const link of links) {
      const element = this.document.createElement('link');
      element.setAttribute('rel', link.rel);
      if (link.hreflang) element.setAttribute('hreflang', link.hreflang);
      element.setAttribute('href', link.href);
      this.append(element);
    }
  }

  private writeJsonLd(items: string[]): void {
    this.removeWhere('script[type="application/ld+json"]', (el) => el.hasAttribute(SEO_MARKER));

    for (const json of items) {
      const element = this.document.createElement('script');
      element.setAttribute('type', 'application/ld+json');
      element.textContent = json;
      this.append(element);
    }
  }

  private removeWhere(selector: string, predicate: (element: Element) => boolean): void {
    for (const element of Array.from(this.document.head.querySelectorAll(selector))) {
      if (predicate(element)) element.remove();
    }
  }

  private append(element: Element): void {
    element.setAttribute(SEO_MARKER, '');
    this.document.head.appendChild(element);
  }
}
