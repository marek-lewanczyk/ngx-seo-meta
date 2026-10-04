# ngx-seo-meta — Design

Date: 2026-10-04
Status: approved in brainstorming, pending spec review

## Goal

A reusable, framework-idiomatic Angular library that manages everything SEO-related in `<head>`:
document title, meta tags, Open Graph, Twitter Card, canonical and `hreflang` links, and JSON-LD.
It must work in any Angular project (SSR, prerender, CSR, zoneless) without project-specific code.

Origin: `SeoService` from the SP2RYM project (`src/app/core/services/seo.service.ts`), generalised.
Migrating SP2RYM to the package is a separate, later step (see "Out of scope").

## Decisions

| Topic | Decision |
|---|---|
| Package name | `ngx-seo-meta` (unscoped, free on npm as of 2026-10-04) |
| Repository | standalone repo at `~/Dev/ngx-seo-meta` |
| Usage modes | both: route-driven (`data.seo`, resolvers) and imperative (`SeoService.update/patch`) |
| v1 features | title template, robots, OG types incl. article/product, extra tags, JSON-LD, hreflang + locale alternates |
| Config source | static object or factory run in an injection context |
| Language | English for code, JSDoc, errors, README |
| Angular support | peer deps `@angular/core`, `@angular/common`, `@angular/platform-browser`, `@angular/router`: `^20.0.0 \|\| ^21.0.0` |

## Repository layout

Angular CLI workspace without an application (`ng new --no-create-application`), one library project.

```
projects/ngx-seo-meta/src/
  public-api.ts
  lib/
    config.ts          SeoConfig, provideSeo(), SEO_CONFIG (internal)
    types.ts           SeoMetadata and related types
    merge.ts           mergeMetadata() — pure
    build-head.ts      buildHead() — pure: metadata + config -> tags, links, json-ld
    url.ts             toAbsoluteUrl() — pure, http/https only
    head-writer.ts     writes the computed head into DOCUMENT, owns cleanup
    json-ld.ts         serializeJsonLd() — pure, escaping
    seo.service.ts     SeoService (update, patch)
    route-seo.ts       withRouteSeo(), SeoTitleStrategy
    dev-warnings.ts    quality checks, ngDevMode only
```

Build: ng-packagr (`ng build ngx-seo-meta`). Tests: `@angular/build:unit-test` (Vitest + jsdom).

## Public API

### Configuration

```ts
interface SeoConfig {
  /** Absolute site origin, e.g. 'https://example.com'. Relative URLs resolve against it. */
  baseUrl: string;
  /** og:site_name; also the document title when no title is resolved. */
  siteName: string;
  /** Template for document.title, '%s' is replaced by the page title, e.g. '%s · Example'. */
  titleTemplate?: string;
  /** Defaults merged under every page's metadata. */
  defaults?: SeoMetadata;
}

function provideSeo(
  config: SeoConfig | (() => SeoConfig),
  ...features: SeoFeature[]
): EnvironmentProviders;

function withRouteSeo(options?: { canonical?: boolean }): SeoFeature; // canonical defaults to true
```

The factory form runs in an injection context, so it can `inject()` environment tokens or `REQUEST` (SSR, multi-tenant).

### Page metadata

Every field is optional. `null` explicitly clears a value inherited from `defaults`.

```ts
interface SeoMetadata {
  title?: string | null;
  /** false disables config.titleTemplate for this page (e.g. home page). */
  titleTemplate?: false;
  description?: string | null;
  /** Canonical + og:url. Path or absolute URL. */
  url?: string | null;
  robots?: string | null;              // e.g. 'noindex, follow'
  author?: string | null;              // meta name="author"
  image?: string | SeoImage | null;
  type?: 'website' | 'article' | 'product' | 'profile' | (string & {}) | null;
  article?: SeoArticle | null;
  product?: SeoProduct | null;
  twitter?: SeoTwitter | null;
  locale?: string | null;              // og:locale, e.g. 'pl_PL'
  localeAlternates?: string[] | null;  // og:locale:alternate
  alternates?: SeoAlternate[] | null;  // <link rel="alternate" hreflang>
  jsonLd?: JsonLd | JsonLd[] | null;
  extraTags?: MetaDefinition[] | null;
}

interface SeoImage { url: string; alt?: string; width?: number; height?: number; }
interface SeoArticle { publishedTime?: string; modifiedTime?: string; authors?: string[]; section?: string; tags?: string[]; }
interface SeoProduct { price: number; currency: string; availability?: 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued'; }
interface SeoTwitter { card?: 'summary' | 'summary_large_image'; site?: string; creator?: string; }
interface SeoAlternate { hreflang: string; url: string; }   // hreflang may be 'x-default'
type JsonLd = Record<string, unknown>;
```

### Service

```ts
class SeoService {
  /** Replaces page metadata; result = merge(defaults, metadata). */
  update(metadata: SeoMetadata): void;
  /** Merges into the current page metadata and re-renders. */
  patch(metadata: SeoMetadata): void;
}
```

## Merge rules (`mergeMetadata`, pure)

The service keeps **page metadata** (without defaults). Rendering always uses `merge(defaults, page)`.

- `update(m)`: `page = m`.
- `patch(p)`: `page = merge(page, p)`.
- `merge(base, over)`:
  - scalar and array fields: `over` wins when the key is present (`undefined` = absent, `null` = clear);
  - `image` given as string is normalised to `{ url }`; `image` always **replaces** as a whole
    (alt text and dimensions describe one specific image, so they must not leak from a default image);
  - objects `twitter`, `article`, `product`: merged one level deep (`undefined` inner fields ignored);
  - exception — `jsonLd` when merging **defaults with page**: concatenated (defaults first),
    so a default `Organization` coexists with a page `Product`. Within `patch`, `jsonLd` replaces.

## Rendering (`buildHead` in `build-head.ts`, pure)

Input: merged metadata + config. Output: `{ title, tags: MetaDefinition[], links, jsonLd: string[] }`.
A field that is `undefined` or `null` produces no tag.

| Source | Output |
|---|---|
| `title` | `document.title` = template applied unless `titleTemplate === false`; no title → `siteName` |
| `title` (raw, untemplated) | `og:title`, `twitter:title` |
| `description` | `description`, `og:description`, `twitter:description` |
| `author`, `robots` | `name="author"`, `name="robots"` |
| `url` | `og:url`, `<link rel="canonical">` (absolute) |
| config `siteName` | `og:site_name` |
| `type` | `og:type`; if absent: `'product'` when `product` set, `'article'` when `article` set, else `'website'` |
| `image` | `og:image` (absolute), `og:image:alt`, `og:image:width/height` only when given; `twitter:image`, `twitter:image:alt` |
| `twitter.card` | default `summary_large_image` with image, `summary` without |
| `twitter.site/creator` | `twitter:site`, `twitter:creator` |
| `article` | `article:published_time`, `article:modified_time`, `article:author` (one per entry), `article:section`, `article:tag` (one per entry) |
| `product` | `product:price:amount` (`toFixed(2)`), `product:price:currency`, `product:availability` |
| `locale`, `localeAlternates` | `og:locale`, `og:locale:alternate` (one per entry) |
| `alternates` | `<link rel="alternate" hreflang="…" href="…">` (absolute) |
| `jsonLd` | one serialized string per object |
| `extraTags` | appended as given |

## Writing to the DOM (`HeadWriter`)

Stateless with respect to memory — ownership is stored in the DOM, so it survives SSR hydration.

- Every element the library creates carries the attribute `data-ngx-seo`.
- Meta tags, per render:
  1. remove every `meta[data-ngx-seo]`;
  2. for each key (`name` / `property`) in the new set, remove existing **unmarked** tags with that key
     (e.g. a static `description` in `index.html`), so no duplicates appear;
  3. create the new tags with `document.createElement` (marked). Repeated keys (`article:tag`, `og:locale:alternate`) are allowed.
- Links: same approach for `link[rel="canonical"]` and `link[rel="alternate"][hreflang]`.
- JSON-LD: remove `script[type="application/ld+json"][data-ngx-seo]`, then append one script per item.
- Tags whose keys the library does not render are never touched.
- `document.title` is set through `Title`.

## Router integration (`withRouteSeo`)

- Registered with `provideEnvironmentInitializer`; subscription ends with the environment injector.
- Listens to **`ResolveEnd`** — after guards and resolvers, before components are created.
  Order is therefore always: route SEO is applied → component may override in its constructor or a later `effect()`.
- Source: `data['seo']` of the deepest primary route snapshot (Angular's `data` inheritance covers empty-path parents).
  Works for static `data: { seo }` and for `resolve: { seo: resolverFn }`.
- Calls `update()` with:
  - `title`: `data.seo.title` ?? the route's own `title` (`snapshot.title`);
  - `url` (when `canonical !== false` and `data.seo.url` is absent): `urlAfterRedirects` without query and fragment;
  - everything else from `data.seo`.
- A route without `data.seo` still triggers `update()`, so the previous page's tags are replaced by defaults.
- Provides `SeoTitleStrategy` (no-op) in place of Angular's `TitleStrategy`, so route `title` does not overwrite the templated title.
- Known limitation (documented): if a navigation is cancelled after `ResolveEnd`, tags reflect the cancelled target until the next navigation.

## Error handling

| Case | Behaviour |
|---|---|
| `SeoService` injected without `provideSeo()` | throws with a message naming `provideSeo()` |
| `baseUrl` not an absolute `http(s)` URL | throws when the config is first resolved |
| invalid or non-`http(s)` URL in `url`, `image`, `alternates` | element omitted; dev-mode warning |
| `jsonLd` not serializable (cycle, BigInt) | that script omitted; dev-mode `console.error` |
| quality hints: title > 60 chars, description > 160, image without `alt`, `type: 'product'` without `product` | dev-mode warning only |

All warnings are wrapped in `ngDevMode` checks and tree-shaken from production builds.

## Security

- JSON-LD: `JSON.stringify`, then escape `<`, `>`, `&`, U+2028, U+2029 as `\uXXXX`; inserted via `textContent`, never `innerHTML`.
- URLs: only `http:` and `https:` accepted after resolution against `baseUrl`.
- Meta and link attributes set via `setAttribute` (never HTML string concatenation).

## SSR

- Only `DOCUMENT`, `Title`, `Router` — no `window`, no storage.
- Server and client compute the same output; `data-ngx-seo` markers let the client clean server-rendered tags correctly.
- Compatible with zoneless change detection and incremental hydration.

## Testing

- `merge.ts`, `build-tags.ts`, `url.ts`, `json-ld.ts`: table-driven unit tests, no DOM — bulk of coverage.
- `head-writer.ts` (jsdom): marking, cleanup of stale tags, replacing unmarked tags with same key, leaving foreign tags, repeated keys, `</script>` payload in JSON-LD.
- `seo.service.ts`: `update` vs `patch`, defaults merge, `null` clearing, missing-config error.
- `route-seo.ts` (`RouterTestingHarness`): static `data.seo`, resolver, route without seo → defaults, component override order, route `title` used and templated, canonical without query, `canonical: false`.
- SSR smoke test: `renderApplication` from `@angular/platform-server`, assert tags in output HTML.

## Repository tooling and release

- GitHub Actions: lint, test, build on every PR and push to `main`.
- Release: on tag `v*`, build and `npm publish --provenance` from `dist/ngx-seo-meta`.
- Semver; `CHANGELOG.md`; README with both usage modes, config factory example, merge rules, SSR notes.
- First release `0.1.0`; `1.0.0` after validation in SP2RYM.

## Out of scope (v1)

- Migrating SP2RYM to the package (separate step after `0.1.0`; includes moving the 404 `noindex` to route data).
- Sitemap / robots.txt generation.
- Typed schema.org builders (users may pass `schema-dts` objects; `JsonLd` is a plain record).
- Multiple `og:image` entries (possible via `extraTags`).
