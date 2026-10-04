import { EnvironmentProviders, InjectionToken, Provider, makeEnvironmentProviders } from '@angular/core';

import { SeoMetadata } from './types';

export interface SeoConfig {
  /** Absolute site origin, e.g. 'https://example.com'. Relative URLs resolve against it. */
  readonly baseUrl: string;
  /** og:site_name; also the document title when a page has no title. */
  readonly siteName: string;
  /** Template for document.title; '%s' is replaced by the page title, e.g. '%s · Example'. */
  readonly titleTemplate?: string;
  /** Defaults merged under every page's metadata. */
  readonly defaults?: SeoMetadata;
}

/** Optional feature passed to `provideSeo()`, e.g. `withRouteSeo()`. */
export interface SeoFeature {
  readonly providers: (Provider | EnvironmentProviders)[];
}

export const SEO_CONFIG = new InjectionToken<SeoConfig>('ngx-seo-meta config');

function validateConfig(config: SeoConfig): SeoConfig {
  let url: URL | null;
  try {
    url = new URL(config.baseUrl);
  } catch {
    url = null;
  }
  if (url?.protocol !== 'http:' && url?.protocol !== 'https:') {
    throw new Error(
      `[ngx-seo-meta] config.baseUrl must be an absolute http(s) URL, got "${config.baseUrl}".`,
    );
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error(
      `[ngx-seo-meta] config.baseUrl must be an origin such as "https://example.com" (no path, query or hash), got "${config.baseUrl}".`,
    );
  }
  return config;
}

/**
 * Registers ngx-seo-meta. `config` may be an object or a factory; the factory runs in an
 * injection context, so it can call `inject()` (e.g. environment tokens or `REQUEST` on the server).
 */
export function provideSeo(config: SeoConfig | (() => SeoConfig), ...features: SeoFeature[]): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SEO_CONFIG,
      useFactory: () => validateConfig(typeof config === 'function' ? config() : config),
    },
    ...features.flatMap((feature) => feature.providers),
  ]);
}
