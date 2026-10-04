import { MetaDefinition } from '@angular/platform-browser';

/** A schema.org object, e.g. `{ '@context': 'https://schema.org', '@type': 'Product', ... }`. */
export type JsonLd = Record<string, unknown>;

export interface SeoImage {
  /** Absolute URL or a path resolved against `SeoConfig.baseUrl`. */
  readonly url: string;
  /** Describe what the image shows. */
  readonly alt?: string;
  /** Pixels. Rendered only when given. */
  readonly width?: number;
  readonly height?: number;
}

export interface SeoArticle {
  /** ISO 8601 date-time. */
  readonly publishedTime?: string;
  readonly modifiedTime?: string;
  readonly authors?: readonly string[];
  readonly section?: string;
  readonly tags?: readonly string[];
}

export type SeoProductAvailability =
  | 'in stock'
  | 'out of stock'
  | 'preorder'
  | 'available for order'
  | 'discontinued';

export interface SeoProduct {
  readonly price: number;
  /** ISO 4217 code, e.g. 'EUR'. */
  readonly currency: string;
  readonly availability?: SeoProductAvailability;
}

export interface SeoTwitter {
  /** Defaults to 'summary_large_image' when an image is present, otherwise 'summary'. */
  readonly card?: 'summary' | 'summary_large_image';
  /** @username of the site. */
  readonly site?: string;
  /** @username of the content author. */
  readonly creator?: string;
}

export interface SeoAlternate {
  /** Language/region code such as 'en', 'pl-PL', or 'x-default'. */
  readonly hreflang: string;
  /** Absolute URL or a path resolved against `SeoConfig.baseUrl`. */
  readonly url: string;
}

/**
 * SEO metadata of a page. Every field is optional.
 * `undefined` means "not set here"; `null` explicitly clears a value inherited from defaults.
 */
export interface SeoMetadata {
  readonly title?: string | null;
  /** `false` disables `SeoConfig.titleTemplate` for this page. */
  readonly titleTemplate?: false;
  readonly description?: string | null;
  /** Canonical URL and og:url. Path or absolute URL. */
  readonly url?: string | null;
  /** e.g. 'noindex, follow'. */
  readonly robots?: string | null;
  readonly author?: string | null;
  readonly image?: string | SeoImage | null;
  /** og:type. Inferred from `product` / `article` when omitted. */
  readonly type?: 'website' | 'article' | 'product' | 'profile' | (string & {}) | null;
  readonly article?: SeoArticle | null;
  readonly product?: SeoProduct | null;
  readonly twitter?: SeoTwitter | null;
  /** og:locale, e.g. 'en_US'. */
  readonly locale?: string | null;
  /** og:locale:alternate entries. */
  readonly localeAlternates?: readonly string[] | null;
  /** `<link rel="alternate" hreflang>` entries. */
  readonly alternates?: readonly SeoAlternate[] | null;
  readonly jsonLd?: JsonLd | readonly JsonLd[] | null;
  /** Any other meta tags, rendered as given. */
  readonly extraTags?: readonly MetaDefinition[] | null;
}
