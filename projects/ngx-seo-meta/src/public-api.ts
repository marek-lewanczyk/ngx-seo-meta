/*
 * Public API Surface of ngx-seo-meta
 */
export { provideSeo } from './lib/config';
export type { SeoConfig, SeoFeature } from './lib/config';
export { withRouteSeo } from './lib/route-seo';
export type { RouteSeoOptions } from './lib/route-seo';
export { SeoService } from './lib/seo.service';
export type {
  JsonLd,
  SeoAlternate,
  SeoArticle,
  SeoImage,
  SeoMetadata,
  SeoProduct,
  SeoProductAvailability,
  SeoTwitter,
} from './lib/types';
