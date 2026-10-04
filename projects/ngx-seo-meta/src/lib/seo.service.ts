import { Injectable, inject } from '@angular/core';

import { buildHead } from './build-head';
import { SEO_CONFIG, SeoConfig } from './config';
import { qualityHints, reportIssues } from './dev-warnings';
import { HeadWriter } from './head-writer';
import { mergeMetadata } from './merge';
import { SeoMetadata } from './types';

declare const ngDevMode: unknown;

/** Sets SEO metadata of the current page. Requires `provideSeo()`. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly config: SeoConfig;
  private readonly writer = inject(HeadWriter);
  private route: SeoMetadata = {};
  private page: SeoMetadata = {};

  constructor() {
    const config = inject(SEO_CONFIG, { optional: true });
    if (!config) {
      throw new Error('[ngx-seo-meta] SeoService requires provideSeo() in your application providers.');
    }
    this.config = config;
  }

  /**
   * Replaces the component-level metadata. Route metadata (from `withRouteSeo`) and defaults stay underneath:
   * component fields override route fields, which override defaults.
   */
  update(metadata: SeoMetadata): void {
    this.page = metadata;
    this.render();
  }

  /** Merges `metadata` into the current component-level metadata (JSON-LD is replaced, not appended). */
  patch(metadata: SeoMetadata): void {
    this.page = mergeMetadata(this.page, metadata, 'replace');
    this.render();
  }

  /** @internal Used by withRouteSeo(); not part of the public API. */
  ɵsetRouteMetadata(metadata: SeoMetadata): void {
    this.route = metadata;
    this.page = {};
    this.render();
  }

  private render(): void {
    const merged = mergeMetadata(this.config.defaults ?? {}, mergeMetadata(this.route, this.page, 'replace'), 'concat');
    const head = buildHead(merged, this.config);

    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      reportIssues([...head.issues, ...qualityHints(merged).map((message) => ({ level: 'warn' as const, message }))]);
    }
    this.writer.write(head);
  }
}
