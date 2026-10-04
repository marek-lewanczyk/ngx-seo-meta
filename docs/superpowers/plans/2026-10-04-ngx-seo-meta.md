# ngx-seo-meta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and package `ngx-seo-meta`, a reusable Angular library that manages title, meta tags, Open Graph, Twitter Card, canonical/hreflang links and JSON-LD, driven by routes or by a service.

**Architecture:** Pure functions (`mergeMetadata`, `buildHead`, `toAbsoluteUrl`, `serializeJsonLd`) compute a `HeadModel` from page metadata + config. `HeadWriter` writes that model into `DOCUMENT`, marking every element with `data-ngx-seo` so cleanup works after SSR hydration. `SeoService` keeps page metadata and re-renders; `withRouteSeo()` feeds it from `data.seo` on `ResolveEnd`.

**Tech Stack:** Angular 21 CLI workspace, ng-packagr, Vitest via `@angular/build:unit-test` (jsdom), angular-eslint, GitHub Actions.

Spec: `docs/superpowers/specs/2026-10-04-ngx-seo-meta-design.md`

## Global Constraints

- Repository root: `~/Dev/ngx-seo-meta` (git repo already initialised, branch `main`, contains `docs/`).
- Package name: `ngx-seo-meta`. Library project name: `ngx-seo-meta`. Source root: `projects/ngx-seo-meta/src`.
- Peer dependencies: `@angular/common`, `@angular/core`, `@angular/platform-browser`, `@angular/router`, each `^20.0.0 || ^21.0.0`.
- English for all code, JSDoc, error messages, README.
- Error/warning prefix: `[ngx-seo-meta]`.
- Ownership marker attribute: `data-ngx-seo` (empty value).
- Allowed URL protocols after resolution: `http:` and `https:` only.
- No `window`, `localStorage` or other browser globals — only `DOCUMENT`, `Title`, `Router`.
- All exported interface fields are `readonly`.
- Run tests with: `npx ng test ngx-seo-meta --watch=false` (single file: add `--include "**/<name>.spec.ts"`).
- Commit messages: Conventional Commits, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` after a blank line.

## File Structure

```
projects/ngx-seo-meta/
  package.json                  library package metadata, peer deps
  src/public-api.ts             public exports
  src/lib/types.ts              SeoMetadata and related types
  src/lib/url.ts                toAbsoluteUrl, stripQueryAndFragment
  src/lib/json-ld.ts            serializeJsonLd
  src/lib/merge.ts              mergeMetadata, toArray, normalizeImage
  src/lib/build-head.ts         buildHead, HeadModel, HeadLink, HeadIssue
  src/lib/config.ts             SeoConfig, SeoFeature, SEO_CONFIG, provideSeo
  src/lib/head-writer.ts        HeadWriter (DOM)
  src/lib/dev-warnings.ts       qualityHints, reportIssues
  src/lib/seo.service.ts        SeoService
  src/lib/route-seo.ts          withRouteSeo, routeMetadata, SeoTitleStrategy
  src/lib/*.spec.ts             tests next to each file
  src/lib/ssr.spec.ts           server render smoke test
README.md, CHANGELOG.md, LICENSE
.github/workflows/ci.yml, .github/workflows/release.yml
```

---

### Task 1: Workspace scaffold

**Files:**
- Create (generated): `angular.json`, `package.json`, `tsconfig.json`, `projects/ngx-seo-meta/**`, `eslint.config.js`
- Modify: `projects/ngx-seo-meta/package.json`, `projects/ngx-seo-meta/src/public-api.ts`
- Delete: generated `projects/ngx-seo-meta/src/lib/ngx-seo-meta.ts` and its spec

**Interfaces:**
- Produces: buildable empty library `ngx-seo-meta`; `npx ng test ngx-seo-meta`, `npx ng build ngx-seo-meta`, `npx ng lint` commands.

- [ ] **Step 1: Generate the workspace into the existing repo**

```bash
cd ~/Dev/ngx-seo-meta
npx -y @angular/cli@21 new ngx-seo-meta --directory . --no-create-application --skip-git --package-manager npm
```

Expected: `angular.json`, `package.json`, `node_modules/` created; `docs/` untouched. If the CLI refuses the non-empty directory, run the same command in an empty temp folder and copy everything except `.git` into the repo (`rsync -a --exclude .git <tmp>/ ~/Dev/ngx-seo-meta/`), then `npm install`.

- [ ] **Step 2: Generate the library and add dev dependencies**

```bash
npx ng generate library ngx-seo-meta --prefix seo
npm i -D jsdom @angular/platform-server@^21
npx ng add angular-eslint --skip-confirmation
```

- [ ] **Step 3: Make sure the library test target uses Vitest**

Open `angular.json`, find `projects.ngx-seo-meta.architect.test`. It must be:

```json
"test": {
  "builder": "@angular/build:unit-test"
}
```

If it shows a Karma builder, replace the whole `test` block with the one above.

- [ ] **Step 4: Remove generated sample code**

```bash
rm projects/ngx-seo-meta/src/lib/ngx-seo-meta.ts projects/ngx-seo-meta/src/lib/ngx-seo-meta.spec.ts
```

Replace `projects/ngx-seo-meta/src/public-api.ts` with:

```ts
/*
 * Public API Surface of ngx-seo-meta
 */
export {};
```

- [ ] **Step 5: Write library package metadata**

Replace `projects/ngx-seo-meta/package.json` with:

```json
{
  "name": "ngx-seo-meta",
  "version": "0.1.0",
  "description": "Typed, SSR-ready Angular SEO: title, meta, Open Graph, Twitter Card, canonical, hreflang and JSON-LD — from routes or a service.",
  "keywords": [
    "angular",
    "seo",
    "meta-tags",
    "open-graph",
    "twitter-card",
    "canonical",
    "hreflang",
    "json-ld",
    "structured-data",
    "ssr"
  ],
  "license": "MIT",
  "author": "Marek Lewańczyk",
  "peerDependencies": {
    "@angular/common": "^20.0.0 || ^21.0.0",
    "@angular/core": "^20.0.0 || ^21.0.0",
    "@angular/platform-browser": "^20.0.0 || ^21.0.0",
    "@angular/router": "^20.0.0 || ^21.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "sideEffects": false
}
```

- [ ] **Step 6: Verify build and lint**

Run: `npx ng build ngx-seo-meta && npx ng lint`
Expected: build writes `dist/ngx-seo-meta`, lint reports no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold ngx-seo-meta library workspace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Types, URL and JSON-LD utilities

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/types.ts`, `projects/ngx-seo-meta/src/lib/url.ts`, `projects/ngx-seo-meta/src/lib/json-ld.ts`
- Test: `projects/ngx-seo-meta/src/lib/url.spec.ts`, `projects/ngx-seo-meta/src/lib/json-ld.spec.ts`

**Interfaces:**
- Produces:
  - types: `JsonLd`, `SeoImage`, `SeoArticle`, `SeoProduct`, `SeoProductAvailability`, `SeoTwitter`, `SeoAlternate`, `SeoMetadata`
  - `toAbsoluteUrl(value: string, baseUrl: string): string | null`
  - `stripQueryAndFragment(url: string): string`
  - `serializeJsonLd(value: JsonLd): string | null`

- [ ] **Step 1: Create the types**

`projects/ngx-seo-meta/src/lib/types.ts`:

```ts
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
```

- [ ] **Step 2: Write failing tests for URL utilities**

`projects/ngx-seo-meta/src/lib/url.spec.ts`:

```ts
import { stripQueryAndFragment, toAbsoluteUrl } from './url';

describe('toAbsoluteUrl', () => {
  const base = 'https://example.com';

  it.each([
    ['/a/b', 'https://example.com/a/b'],
    ['a/b', 'https://example.com/a/b'],
    ['https://cdn.example.org/x.jpg', 'https://cdn.example.org/x.jpg'],
    ['http://example.com/x', 'http://example.com/x'],
  ])('resolves %s', (input, expected) => {
    expect(toAbsoluteUrl(input, base)).toBe(expected);
  });

  it.each(['javascript:alert(1)', 'data:text/plain,hi', 'mailto:a@example.com', 'http://'])(
    'rejects %s',
    (input) => {
      expect(toAbsoluteUrl(input, base)).toBeNull();
    },
  );
});

describe('stripQueryAndFragment', () => {
  it.each([
    ['/a?x=1#top', '/a'],
    ['/a#top', '/a'],
    ['/a?x=1', '/a'],
    ['/a', '/a'],
  ])('%s -> %s', (input, expected) => {
    expect(stripQueryAndFragment(input)).toBe(expected);
  });
});
```

- [ ] **Step 3: Write failing tests for JSON-LD serialization**

`projects/ngx-seo-meta/src/lib/json-ld.spec.ts`:

```ts
import { serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('serializes a plain object', () => {
    expect(serializeJsonLd({ '@type': 'Thing', name: 'A' })).toBe('{"@type":"Thing","name":"A"}');
  });

  it('escapes characters that could break out of the script element', () => {
    const name = '</script><script>alert(1)</script> & \u2028\u2029';
    const out = serializeJsonLd({ name })!;

    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual({ name });
  });

  it('returns null for a cyclic object', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(serializeJsonLd(value)).toBeNull();
  });

  it('returns null for a BigInt value', () => {
    expect(serializeJsonLd({ n: 1n })).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false`
Expected: FAIL — cannot resolve `./url` and `./json-ld`.

- [ ] **Step 5: Implement the utilities**

`projects/ngx-seo-meta/src/lib/url.ts`:

```ts
/** Resolves `value` against `baseUrl`. Returns null for invalid URLs and non-http(s) protocols. */
export function toAbsoluteUrl(value: string, baseUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(value, baseUrl);
  } catch {
    return null;
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
}

/** Removes `?query` and `#fragment` from a URL or path. */
export function stripQueryAndFragment(url: string): string {
  const index = url.search(/[?#]/);
  return index === -1 ? url : url.slice(0, index);
}
```

`projects/ngx-seo-meta/src/lib/json-ld.ts`:

```ts
import { JsonLd } from './types';

const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serializes JSON-LD so it is safe inside `<script type="application/ld+json">`.
 * Returns null when the value cannot be serialized (cycles, BigInt).
 */
export function serializeJsonLd(value: JsonLd): string | null {
  let json: string | undefined;
  try {
    json = JSON.stringify(value);
  } catch {
    return null;
  }
  if (json === undefined) {
    return null;
  }
  return json.replace(/[<>&\u2028\u2029]/g, (char) => ESCAPES[char]);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false`
Expected: PASS, all tests in `url.spec.ts` and `json-ld.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-seo-meta/src/lib
git commit -m "feat: add SEO types, URL and JSON-LD utilities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Metadata merging

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/merge.ts`
- Test: `projects/ngx-seo-meta/src/lib/merge.spec.ts`

**Interfaces:**
- Consumes: `SeoMetadata`, `SeoImage`, `JsonLd` from `./types`
- Produces:
  - `type JsonLdMergeMode = 'concat' | 'replace'`
  - `mergeMetadata(base: SeoMetadata, over: SeoMetadata, jsonLdMode: JsonLdMergeMode): SeoMetadata`
  - `toArray<T>(value: T | readonly T[] | null | undefined): T[]`
  - `normalizeImage(image: SeoMetadata['image']): SeoImage | null | undefined`

- [ ] **Step 1: Write the failing tests**

`projects/ngx-seo-meta/src/lib/merge.spec.ts`:

```ts
import { mergeMetadata, normalizeImage, toArray } from './merge';
import { SeoMetadata } from './types';

describe('mergeMetadata', () => {
  it('lets the page override scalar fields', () => {
    expect(mergeMetadata({ description: 'a', robots: 'index' }, { description: 'b' }, 'concat')).toEqual({
      description: 'b',
      robots: 'index',
    });
  });

  it('ignores undefined values in the override', () => {
    expect(mergeMetadata({ description: 'a' }, { description: undefined }, 'concat')).toEqual({
      description: 'a',
    });
  });

  it('clears a value with null', () => {
    expect(mergeMetadata({ description: 'a' }, { description: null }, 'concat')).toEqual({ description: null });
  });

  it('normalizes a string image and replaces the default image entirely', () => {
    const base: SeoMetadata = { image: { url: '/default.jpg', alt: 'Default', width: 1200, height: 630 } };
    expect(mergeMetadata(base, { image: '/page.jpg' }, 'concat')).toEqual({ image: { url: '/page.jpg' } });
  });

  it('normalizes a string image coming from the base', () => {
    expect(mergeMetadata({ image: '/default.jpg' }, {}, 'concat')).toEqual({ image: { url: '/default.jpg' } });
  });

  it('merges twitter, article and product one level deep', () => {
    const result = mergeMetadata(
      { twitter: { site: '@site' }, product: { price: 1, currency: 'EUR' } },
      { twitter: { creator: '@me', site: undefined }, product: { price: 2, currency: 'EUR', availability: 'in stock' } },
      'concat',
    );
    expect(result.twitter).toEqual({ site: '@site', creator: '@me' });
    expect(result.product).toEqual({ price: 2, currency: 'EUR', availability: 'in stock' });
  });

  it('concatenates jsonLd in concat mode', () => {
    const org = { '@type': 'Organization' };
    const product = { '@type': 'Product' };
    expect(mergeMetadata({ jsonLd: org }, { jsonLd: product }, 'concat').jsonLd).toEqual([org, product]);
  });

  it('replaces jsonLd in replace mode', () => {
    const product = { '@type': 'Product' };
    expect(mergeMetadata({ jsonLd: { '@type': 'Organization' } }, { jsonLd: product }, 'replace').jsonLd).toBe(product);
  });

  it('clears jsonLd with null in concat mode', () => {
    expect(mergeMetadata({ jsonLd: { '@type': 'Organization' } }, { jsonLd: null }, 'concat').jsonLd).toBeNull();
  });

  it('does not mutate its inputs', () => {
    const base: SeoMetadata = { twitter: { site: '@site' } };
    const over: SeoMetadata = { twitter: { creator: '@me' } };
    mergeMetadata(base, over, 'concat');
    expect(base).toEqual({ twitter: { site: '@site' } });
    expect(over).toEqual({ twitter: { creator: '@me' } });
  });
});

describe('toArray', () => {
  it.each<[unknown, unknown[]]>([
    [undefined, []],
    [null, []],
    [1, [1]],
    [[1, 2], [1, 2]],
  ])('%j -> %j', (input, expected) => {
    expect(toArray(input)).toEqual(expected);
  });
});

describe('normalizeImage', () => {
  it('wraps a string', () => expect(normalizeImage('/a.jpg')).toEqual({ url: '/a.jpg' }));
  it('keeps an object', () => expect(normalizeImage({ url: '/a.jpg', alt: 'A' })).toEqual({ url: '/a.jpg', alt: 'A' }));
  it('keeps null and undefined', () => {
    expect(normalizeImage(null)).toBeNull();
    expect(normalizeImage(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/merge.spec.ts"`
Expected: FAIL — cannot resolve `./merge`.

- [ ] **Step 3: Implement**

`projects/ngx-seo-meta/src/lib/merge.ts`:

```ts
import { SeoImage, SeoMetadata } from './types';

export type JsonLdMergeMode = 'concat' | 'replace';

const NESTED_KEYS = new Set(['twitter', 'article', 'product']);

export function toArray<T>(value: T | readonly T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? [...(value as readonly T[])] : [value as T];
}

export function normalizeImage(image: SeoMetadata['image']): SeoImage | null | undefined {
  return typeof image === 'string' ? { url: image } : image;
}

function definedEntries(value: object): [string, unknown][] {
  return Object.entries(value).filter(([, entry]) => entry !== undefined);
}

/**
 * Merges `over` onto `base`:
 * - `undefined` in `over` is ignored, `null` clears;
 * - `twitter`, `article`, `product` merge one level deep;
 * - `image` always replaces as a whole;
 * - `jsonLd` concatenates (`concat`) or replaces (`replace`).
 */
export function mergeMetadata(base: SeoMetadata, over: SeoMetadata, jsonLdMode: JsonLdMergeMode): SeoMetadata {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of definedEntries(over)) {
    const current = result[key];
    if (value !== null && NESTED_KEYS.has(key) && current !== null && current !== undefined) {
      result[key] = { ...(current as object), ...Object.fromEntries(definedEntries(value as object)) };
    } else if (key === 'jsonLd' && value !== null && jsonLdMode === 'concat') {
      result[key] = [...toArray(current as SeoMetadata['jsonLd']), ...toArray(value as SeoMetadata['jsonLd'])];
    } else {
      result[key] = value;
    }
  }

  if (result['image'] !== undefined) {
    result['image'] = normalizeImage(result['image'] as SeoMetadata['image']);
  }
  return result as SeoMetadata;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/merge.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-seo-meta/src/lib/merge.ts projects/ngx-seo-meta/src/lib/merge.spec.ts
git commit -m "feat: add metadata merge rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Configuration and `provideSeo`

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/config.ts`
- Test: `projects/ngx-seo-meta/src/lib/config.spec.ts`

**Interfaces:**
- Consumes: `SeoMetadata` from `./types`
- Produces:
  - `interface SeoConfig { readonly baseUrl: string; readonly siteName: string; readonly titleTemplate?: string; readonly defaults?: SeoMetadata }`
  - `interface SeoFeature { readonly providers: (Provider | EnvironmentProviders)[] }`
  - `SEO_CONFIG: InjectionToken<SeoConfig>` (internal, not exported from public API)
  - `provideSeo(config: SeoConfig | (() => SeoConfig), ...features: SeoFeature[]): EnvironmentProviders`

- [ ] **Step 1: Write the failing tests**

`projects/ngx-seo-meta/src/lib/config.spec.ts`:

```ts
import { InjectionToken, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideSeo, SEO_CONFIG } from './config';

describe('provideSeo', () => {
  it('provides a static config', () => {
    TestBed.configureTestingModule({ providers: [provideSeo({ baseUrl: 'https://example.com', siteName: 'Example' })] });
    expect(TestBed.inject(SEO_CONFIG).siteName).toBe('Example');
  });

  it('runs a factory in an injection context', () => {
    const SITE_URL = new InjectionToken<string>('SITE_URL');
    TestBed.configureTestingModule({
      providers: [
        { provide: SITE_URL, useValue: 'https://tenant.example.com' },
        provideSeo(() => ({ baseUrl: inject(SITE_URL), siteName: 'Tenant' })),
      ],
    });
    expect(TestBed.inject(SEO_CONFIG).baseUrl).toBe('https://tenant.example.com');
  });

  it.each(['/relative', 'example.com', 'ftp://example.com'])('rejects baseUrl %s', (baseUrl) => {
    TestBed.configureTestingModule({ providers: [provideSeo({ baseUrl, siteName: 'X' })] });
    expect(() => TestBed.inject(SEO_CONFIG)).toThrowError(/\[ngx-seo-meta\].*baseUrl/);
  });

  it('includes providers of features', () => {
    const FLAG = new InjectionToken<boolean>('FLAG');
    TestBed.configureTestingModule({
      providers: [
        provideSeo({ baseUrl: 'https://example.com', siteName: 'X' }, { providers: [{ provide: FLAG, useValue: true }] }),
      ],
    });
    expect(TestBed.inject(FLAG)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/config.spec.ts"`
Expected: FAIL — cannot resolve `./config`.

- [ ] **Step 3: Implement**

`projects/ngx-seo-meta/src/lib/config.ts`:

```ts
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
  let protocol: string | null = null;
  try {
    protocol = new URL(config.baseUrl).protocol;
  } catch {
    protocol = null;
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(
      `[ngx-seo-meta] config.baseUrl must be an absolute http(s) URL, got "${config.baseUrl}".`,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/config.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-seo-meta/src/lib/config.ts projects/ngx-seo-meta/src/lib/config.spec.ts
git commit -m "feat: add provideSeo with static or factory config

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Head model builder

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/build-head.ts`
- Test: `projects/ngx-seo-meta/src/lib/build-head.spec.ts`

**Interfaces:**
- Consumes: `SeoMetadata` (`./types`), `SeoConfig` (`./config`), `toAbsoluteUrl` (`./url`), `serializeJsonLd` (`./json-ld`), `toArray`, `normalizeImage` (`./merge`)
- Produces:
  - `interface HeadLink { readonly rel: 'canonical' | 'alternate'; readonly href: string; readonly hreflang?: string }`
  - `interface HeadIssue { readonly level: 'warn' | 'error'; readonly message: string }`
  - `interface HeadModel { readonly title: string; readonly tags: MetaDefinition[]; readonly links: HeadLink[]; readonly jsonLd: string[]; readonly issues: HeadIssue[] }`
  - `buildHead(metadata: SeoMetadata, config: SeoConfig): HeadModel` — expects already merged metadata

- [ ] **Step 1: Write the failing tests**

`projects/ngx-seo-meta/src/lib/build-head.spec.ts`:

```ts
import { buildHead, HeadModel } from './build-head';
import { SeoConfig } from './config';

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

  it.each([
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/build-head.spec.ts"`
Expected: FAIL — cannot resolve `./build-head`.

- [ ] **Step 3: Implement**

`projects/ngx-seo-meta/src/lib/build-head.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/build-head.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-seo-meta/src/lib/build-head.ts projects/ngx-seo-meta/src/lib/build-head.spec.ts
git commit -m "feat: build head model from SEO metadata

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Head writer (DOM)

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/head-writer.ts`
- Test: `projects/ngx-seo-meta/src/lib/head-writer.spec.ts`

**Interfaces:**
- Consumes: `HeadModel`, `HeadLink` from `./build-head`
- Produces:
  - `const SEO_MARKER = 'data-ngx-seo'`
  - `@Injectable({ providedIn: 'root' }) class HeadWriter { write(head: HeadModel): void }`

- [ ] **Step 1: Write the failing tests**

`projects/ngx-seo-meta/src/lib/head-writer.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/head-writer.spec.ts"`
Expected: FAIL — cannot resolve `./head-writer`.

- [ ] **Step 3: Implement**

`projects/ngx-seo-meta/src/lib/head-writer.ts`:

```ts
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
    const keys = new Set(links.map((link) => linkKey(link.rel, link.hreflang)));
    this.removeWhere(
      'link',
      (el) => el.hasAttribute(SEO_MARKER) || keys.has(linkKey(el.getAttribute('rel'), el.getAttribute('hreflang'))),
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/head-writer.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-seo-meta/src/lib/head-writer.ts projects/ngx-seo-meta/src/lib/head-writer.spec.ts
git commit -m "feat: write head model into the document with ownership markers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Dev warnings and `SeoService`

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/dev-warnings.ts`, `projects/ngx-seo-meta/src/lib/seo.service.ts`
- Test: `projects/ngx-seo-meta/src/lib/dev-warnings.spec.ts`, `projects/ngx-seo-meta/src/lib/seo.service.spec.ts`

**Interfaces:**
- Consumes: `SEO_CONFIG`, `SeoConfig`, `provideSeo` (`./config`); `mergeMetadata` (`./merge`); `buildHead`, `HeadIssue` (`./build-head`); `HeadWriter`, `SEO_MARKER` (`./head-writer`); `normalizeImage` (`./merge`)
- Produces:
  - `qualityHints(metadata: SeoMetadata): string[]`
  - `reportIssues(issues: HeadIssue[]): void`
  - `@Injectable({ providedIn: 'root' }) class SeoService { update(metadata: SeoMetadata): void; patch(metadata: SeoMetadata): void }`

- [ ] **Step 1: Write failing tests for dev warnings**

`projects/ngx-seo-meta/src/lib/dev-warnings.spec.ts`:

```ts
import { qualityHints, reportIssues } from './dev-warnings';

describe('qualityHints', () => {
  it('returns nothing for good metadata', () => {
    expect(qualityHints({ title: 'Short', description: 'Fine', image: { url: '/a.jpg', alt: 'A' } })).toEqual([]);
  });

  it('flags a long title and description', () => {
    const hints = qualityHints({ title: 'x'.repeat(61), description: 'y'.repeat(161) });
    expect(hints).toEqual([expect.stringContaining('Title'), expect.stringContaining('Description')]);
  });

  it('flags an image without alt text', () => {
    expect(qualityHints({ image: '/a.jpg' })).toEqual([expect.stringContaining('alt')]);
  });

  it('flags type product without product data', () => {
    expect(qualityHints({ type: 'product' })).toEqual([expect.stringContaining('product')]);
  });
});

describe('reportIssues', () => {
  it('logs with the library prefix at the given level', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportIssues([
      { level: 'warn', message: 'W' },
      { level: 'error', message: 'E' },
    ]);

    expect(warn).toHaveBeenCalledWith('[ngx-seo-meta] W');
    expect(error).toHaveBeenCalledWith('[ngx-seo-meta] E');
    warn.mockRestore();
    error.mockRestore();
  });
});
```

- [ ] **Step 2: Write failing tests for the service**

`projects/ngx-seo-meta/src/lib/seo.service.spec.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/dev-warnings.spec.ts" --include "**/seo.service.spec.ts"`
Expected: FAIL — cannot resolve `./dev-warnings` and `./seo.service`.

- [ ] **Step 4: Implement dev warnings**

`projects/ngx-seo-meta/src/lib/dev-warnings.ts`:

```ts
import { HeadIssue } from './build-head';
import { normalizeImage } from './merge';
import { SeoMetadata } from './types';

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

/** Non-blocking SEO quality checks for merged metadata. */
export function qualityHints(metadata: SeoMetadata): string[] {
  const hints: string[] = [];
  const { title, description } = metadata;

  if (title && title.length > MAX_TITLE) {
    hints.push(`Title has ${title.length} characters; search engines usually truncate after ~${MAX_TITLE}.`);
  }
  if (description && description.length > MAX_DESCRIPTION) {
    hints.push(
      `Description has ${description.length} characters; search engines usually truncate after ~${MAX_DESCRIPTION}.`,
    );
  }
  const image = normalizeImage(metadata.image);
  if (image && !image.alt) {
    hints.push(`Image "${image.url}" has no alt text.`);
  }
  if (metadata.type === 'product' && !metadata.product) {
    hints.push('og:type is "product" but no product data was given; product:* tags will be missing.');
  }
  return hints;
}

export function reportIssues(issues: HeadIssue[]): void {
  for (const issue of issues) {
    console[issue.level](`[ngx-seo-meta] ${issue.message}`);
  }
}
```

- [ ] **Step 5: Implement the service**

`projects/ngx-seo-meta/src/lib/seo.service.ts`:

```ts
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
  private page: SeoMetadata = {};

  constructor() {
    const config = inject(SEO_CONFIG, { optional: true });
    if (!config) {
      throw new Error('[ngx-seo-meta] SeoService requires provideSeo() in your application providers.');
    }
    this.config = config;
  }

  /** Replaces the page metadata. Rendered result = defaults merged with `metadata`. */
  update(metadata: SeoMetadata): void {
    this.page = metadata;
    this.render();
  }

  /** Merges `metadata` into the current page metadata (JSON-LD is replaced, not appended). */
  patch(metadata: SeoMetadata): void {
    this.page = mergeMetadata(this.page, metadata, 'replace');
    this.render();
  }

  private render(): void {
    const merged = mergeMetadata(this.config.defaults ?? {}, this.page, 'concat');
    const head = buildHead(merged, this.config);

    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      reportIssues([...head.issues, ...qualityHints(merged).map((message) => ({ level: 'warn' as const, message }))]);
    }
    this.writer.write(head);
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false`
Expected: PASS, all spec files.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-seo-meta/src/lib
git commit -m "feat: add SeoService with update, patch and dev warnings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Router integration (`withRouteSeo`)

**Files:**
- Create: `projects/ngx-seo-meta/src/lib/route-seo.ts`
- Test: `projects/ngx-seo-meta/src/lib/route-seo.spec.ts`

**Interfaces:**
- Consumes: `SeoFeature` (`./config`), `SeoService` (`./seo.service`), `stripQueryAndFragment` (`./url`), `SeoMetadata` (`./types`)
- Produces:
  - `interface RouteSeoOptions { readonly canonical?: boolean }`
  - `withRouteSeo(options?: RouteSeoOptions): SeoFeature`
  - `routeMetadata(event: ResolveEnd, options: RouteSeoOptions): SeoMetadata`
  - `@Injectable() class SeoTitleStrategy extends TitleStrategy`

- [ ] **Step 1: Write the failing tests**

`projects/ngx-seo-meta/src/lib/route-seo.spec.ts`:

```ts
import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideSeo, SeoConfig } from './config';
import { RouteSeoOptions, withRouteSeo } from './route-seo';
import { SeoService } from './seo.service';

@Component({ template: '' })
class Blank {}

@Component({ template: '' })
class Overriding {
  constructor() {
    inject(SeoService).update({ title: 'From component' });
  }
}

const routes: Routes = [
  { path: 'static', component: Blank, data: { seo: { title: 'Static', description: 'Static description' } } },
  { path: 'resolved', component: Blank, resolve: { seo: () => ({ title: 'Resolved' }) } },
  { path: 'titled', component: Blank, title: 'Route title' },
  { path: 'plain', component: Blank },
  { path: 'override', component: Overriding, data: { seo: { title: 'From route' } } },
  { path: 'own-url', component: Blank, data: { seo: { url: '/custom' } } },
];

const config: SeoConfig = {
  baseUrl: 'https://example.com',
  siteName: 'Example',
  titleTemplate: '%s · Example',
  defaults: { description: 'Default description' },
};

describe('withRouteSeo', () => {
  let document: Document;
  let harness: RouterTestingHarness;

  const content = (key: string) =>
    document.head.querySelector<HTMLMetaElement>(`meta[name="${key}"], meta[property="${key}"]`)?.content ?? null;
  const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

  async function setup(options?: RouteSeoOptions): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideSeo(config, withRouteSeo(options))] });
    document = TestBed.inject(DOCUMENT);
    harness = await RouterTestingHarness.create();
  }

  afterEach(() => document.head.querySelectorAll('meta, link, script').forEach((el) => el.remove()));

  it('applies static route data', async () => {
    await setup();
    await harness.navigateByUrl('/static');

    expect(document.title).toBe('Static · Example');
    expect(content('description')).toBe('Static description');
  });

  it('applies resolved route data', async () => {
    await setup();
    await harness.navigateByUrl('/resolved');

    expect(document.title).toBe('Resolved · Example');
  });

  it('uses and templates the route title', async () => {
    await setup();
    await harness.navigateByUrl('/titled');

    expect(document.title).toBe('Route title · Example');
    expect(content('og:title')).toBe('Route title');
  });

  it('resets to defaults on a route without seo data', async () => {
    await setup();
    await harness.navigateByUrl('/static');
    await harness.navigateByUrl('/plain');

    expect(document.title).toBe('Example');
    expect(content('description')).toBe('Default description');
  });

  it('lets the component override route seo', async () => {
    await setup();
    await harness.navigateByUrl('/override');

    expect(document.title).toBe('From component · Example');
  });

  it('derives canonical from the URL without query and fragment', async () => {
    await setup();
    await harness.navigateByUrl('/static?utm_source=x#top');

    expect(canonical()).toBe('https://example.com/static');
  });

  it('prefers an explicit url from route data', async () => {
    await setup();
    await harness.navigateByUrl('/own-url');

    expect(canonical()).toBe('https://example.com/custom');
  });

  it('skips automatic canonical when disabled', async () => {
    await setup({ canonical: false });
    await harness.navigateByUrl('/static');

    expect(canonical()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/route-seo.spec.ts"`
Expected: FAIL — cannot resolve `./route-seo`.

- [ ] **Step 3: Implement**

`projects/ngx-seo-meta/src/lib/route-seo.ts`:

```ts
import { DestroyRef, Injectable, inject, provideEnvironmentInitializer } from '@angular/core';
import { ResolveEnd, Router, RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { SeoFeature } from './config';
import { SeoService } from './seo.service';
import { SeoMetadata } from './types';
import { stripQueryAndFragment } from './url';

export interface RouteSeoOptions {
  /** Derive the canonical URL from the router URL when `data.seo.url` is absent. Default: true. */
  readonly canonical?: boolean;
}

/** Replaces Angular's TitleStrategy: the title is set by SeoService (with the template). */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  override updateTitle(_snapshot: RouterStateSnapshot): void {
    // Intentionally empty.
  }
}

/** Builds page metadata for a navigation from `data.seo` of the deepest primary route. */
export function routeMetadata(event: ResolveEnd, options: RouteSeoOptions): SeoMetadata {
  let route = event.state.root;
  while (route.firstChild) {
    route = route.firstChild;
  }

  const data = (route.data['seo'] ?? {}) as SeoMetadata;
  const title = data.title !== undefined ? data.title : route.title;
  const url =
    data.url !== undefined || options.canonical === false ? data.url : stripQueryAndFragment(event.urlAfterRedirects);

  return { ...data, title, url };
}

/**
 * Applies `data.seo` (static or from a resolver) on every navigation, at `ResolveEnd`:
 * after guards and resolvers, before components are created, so components can still override it.
 */
export function withRouteSeo(options: RouteSeoOptions = {}): SeoFeature {
  return {
    providers: [
      { provide: TitleStrategy, useClass: SeoTitleStrategy },
      provideEnvironmentInitializer(() => {
        const router = inject(Router);
        const seo = inject(SeoService);
        const subscription = router.events.subscribe((event) => {
          if (event instanceof ResolveEnd) {
            seo.update(routeMetadata(event, options));
          }
        });
        inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
      }),
    ],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/route-seo.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Run the full suite and lint**

Run: `npx ng test ngx-seo-meta --watch=false && npx ng lint`
Expected: all specs PASS, no lint errors. If lint flags the unused `_snapshot` parameter, keep the name and add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above `updateTitle`.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-seo-meta/src/lib/route-seo.ts projects/ngx-seo-meta/src/lib/route-seo.spec.ts
git commit -m "feat: add withRouteSeo router integration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Public API and SSR smoke test

**Files:**
- Modify: `projects/ngx-seo-meta/src/public-api.ts`
- Test: `projects/ngx-seo-meta/src/lib/ssr.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–8
- Produces: public exports `provideSeo`, `SeoConfig`, `SeoFeature`, `withRouteSeo`, `RouteSeoOptions`, `SeoService`, and types `SeoMetadata`, `SeoImage`, `SeoArticle`, `SeoProduct`, `SeoProductAvailability`, `SeoTwitter`, `SeoAlternate`, `JsonLd`. Not exported: `SEO_CONFIG`, `HeadWriter`, `buildHead`, `mergeMetadata`, utilities.

- [ ] **Step 1: Write the public API**

`projects/ngx-seo-meta/src/public-api.ts`:

```ts
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
```

- [ ] **Step 2: Write the SSR smoke test**

`projects/ngx-seo-meta/src/lib/ssr.spec.ts`:

```ts
import { Component } from '@angular/core';
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { provideRouter, RouterOutlet } from '@angular/router';

import { provideSeo, withRouteSeo } from '../public-api';

@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />' })
class Root {}

@Component({ template: 'page' })
class Page {}

describe('server rendering', () => {
  it('renders SEO tags into the HTML', async () => {
    const html = await renderApplication(
      (context: BootstrapContext) =>
        bootstrapApplication(
          Root,
          {
            providers: [
              provideRouter([
                {
                  path: 'product',
                  component: Page,
                  data: {
                    seo: {
                      title: 'Antenna',
                      description: 'Rendered on the server',
                      product: { price: 249, currency: 'PLN' },
                      jsonLd: { '@type': 'Product', name: '</script>' },
                    },
                  },
                },
              ]),
              provideSeo({ baseUrl: 'https://example.com', siteName: 'Example', titleTemplate: '%s · Example' }, withRouteSeo()),
            ],
          },
          context,
        ),
      {
        document: '<html><head><meta name="description" content="static"></head><body><app-root></app-root></body></html>',
        url: '/product',
      },
    );

    expect(html).toContain('<title>Antenna · Example</title>');
    expect(html).toContain('<meta property="og:type" content="product" data-ngx-seo="">');
    expect(html).toContain('<link rel="canonical" href="https://example.com/product" data-ngx-seo="">');
    expect(html).not.toContain('content="static"');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).not.toContain('"</script>');
  });
});
```

- [ ] **Step 3: Run the SSR test**

Run: `npx ng test ngx-seo-meta --watch=false --include "**/ssr.spec.ts"`
Expected: PASS. Troubleshooting if it fails at bootstrap:
- error `NG0401` (missing platform): confirm `context` is passed as the third argument of `bootstrapApplication`;
- error about missing server rendering providers: add `provideServerRendering()` from `@angular/ssr` (`npm i -D @angular/ssr@^21`) to the providers array;
- attribute order differs in the output: replace the two exact `toContain` assertions for `og:type` and `canonical` with regex matches, e.g. `toMatch(/<meta[^>]*property="og:type"[^>]*content="product"/)`.

- [ ] **Step 4: Run everything and build the package**

Run: `npx ng test ngx-seo-meta --watch=false && npx ng lint && npx ng build ngx-seo-meta`
Expected: all PASS; `dist/ngx-seo-meta` contains `package.json`, `fesm2022/ngx-seo-meta.mjs`, `index.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-seo-meta/src
git commit -m "feat: expose public API and verify server rendering

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Documentation, CI and release workflow

**Files:**
- Create: `README.md` (repo root), `CHANGELOG.md`, `LICENSE`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Modify: `angular.json` (copy README and LICENSE into the package), `projects/ngx-seo-meta/package.json` (repository fields)

**Interfaces:**
- Consumes: public API from Task 9
- Produces: publishable package; CI and tag-based release pipelines

- [ ] **Step 1: Write README.md**

`README.md`:

````markdown
# ngx-seo-meta

Typed, SSR-ready SEO for Angular: document title, meta tags, Open Graph, Twitter Card, canonical and `hreflang` links, and JSON-LD — set from route data or from a service.

- Works with SSR, prerendering, hydration and zoneless apps
- Cleans up after every navigation — no stale tags from the previous page
- JSON-LD is escaped; only `http(s)` URLs are accepted
- Angular 20 and 21

## Install

```bash
npm install ngx-seo-meta
```

## Setup

```ts
import { provideSeo, withRouteSeo } from 'ngx-seo-meta';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideSeo(
      {
        baseUrl: 'https://example.com',
        siteName: 'Example',
        titleTemplate: '%s · Example',
        defaults: {
          description: 'What the site is about.',
          locale: 'en_US',
          image: { url: '/og/default.jpg', alt: 'Example logo on a dark background', width: 1200, height: 630 },
          twitter: { site: '@example' },
          jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example', url: 'https://example.com' },
        },
      },
      withRouteSeo(),
    ),
  ],
};
```

The config may also be a factory running in an injection context:

```ts
provideSeo(() => ({ baseUrl: inject(SITE_URL), siteName: 'Example' }));
```

## Route data

```ts
export const routes: Routes = [
  { path: '', component: Home, data: { seo: { title: 'Example — Home', titleTemplate: false } } },
  { path: 'about', component: About, title: 'About us' }, // route title is used and templated
  { path: 'products/:id', component: Product, resolve: { seo: productSeoResolver } },
  { path: '**', component: NotFound, data: { seo: { title: 'Not found', robots: 'noindex, follow' } } },
];

export const productSeoResolver: ResolveFn<SeoMetadata> = (route) =>
  inject(ProductApi).get(route.paramMap.get('id')!).pipe(
    map((p) => ({
      title: p.name,
      description: p.summary,
      image: { url: p.imageUrl, alt: p.imageAlt },
      product: { price: p.price, currency: 'EUR', availability: p.stock > 0 ? 'in stock' : 'out of stock' },
      jsonLd: { '@context': 'https://schema.org', '@type': 'Product', name: p.name },
    })),
  );
```

`withRouteSeo()` applies `data.seo` at `ResolveEnd` (before components are created). Without `data.seo` it resets to `defaults`. The canonical URL is derived from the router URL without query and fragment; disable with `withRouteSeo({ canonical: false })`.

## Service

```ts
const seo = inject(SeoService);

seo.update({ title: 'Product', description: '…' }); // replaces page metadata
seo.patch({ image: { url: '/p.jpg', alt: '…' } });  // merges into page metadata
```

When both are used, a component's `update()` / `patch()` runs after the route data and wins.

## Merge rules

- Rendered metadata = `defaults` merged with page metadata.
- `undefined` means "not set"; `null` clears a default (e.g. `image: null`).
- `twitter`, `article`, `product` merge one level deep; `image` replaces as a whole.
- `jsonLd` from defaults and page are combined; within `patch()` page JSON-LD is replaced.

## Rendered tags

| Field | Output |
|---|---|
| `title` | `<title>` (templated), `og:title`, `twitter:title` |
| `description` | `description`, `og:description`, `twitter:description` |
| `url` | `og:url`, `<link rel="canonical">` |
| `image` | `og:image`, `og:image:alt`, `og:image:width/height`, `twitter:image`, `twitter:image:alt` |
| `type` | `og:type` (inferred: `product` → `article` → `website`) |
| `article` | `article:published_time`, `modified_time`, `author`, `section`, `tag` |
| `product` | `product:price:amount`, `product:price:currency`, `product:availability` |
| `robots`, `author` | `robots`, `author` |
| `twitter` | `twitter:card`, `twitter:site`, `twitter:creator` |
| `locale`, `localeAlternates` | `og:locale`, `og:locale:alternate` |
| `alternates` | `<link rel="alternate" hreflang>` |
| `jsonLd` | `<script type="application/ld+json">` per item |
| `extraTags` | any meta tag, as given |

Every element created by the library carries `data-ngx-seo`. Tags it does not manage are never touched; an unmarked tag with the same key (e.g. a static `description` in `index.html`) is replaced.

## License

MIT
````

- [ ] **Step 2: Copy README and LICENSE into the package build**

In `angular.json`, under `projects.ngx-seo-meta.architect.build.options`, add:

```json
"assets": ["README.md", "LICENSE"]
```

If ng-packagr rejects paths outside the project, instead add to `projects/ngx-seo-meta/ng-package.json`:

```json
"assets": ["../../README.md", "../../LICENSE"]
```

- [ ] **Step 3: Write LICENSE and CHANGELOG**

`LICENSE`: standard MIT text with the line `Copyright (c) 2026 Marek Lewańczyk`.

`CHANGELOG.md`:

```markdown
# Changelog

## 0.1.0 — unreleased

- `provideSeo()` with static or factory config and `defaults`
- `SeoService.update()` / `patch()`
- `withRouteSeo()`: `data.seo`, resolvers, route `title`, automatic canonical
- Title template, robots, Open Graph (website/article/product/profile), Twitter Card
- Canonical, `hreflang` alternates, `og:locale:alternate`
- JSON-LD with safe escaping
- Ownership markers (`data-ngx-seo`) for clean SSR hydration
```

- [ ] **Step 4: Write the CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx ng lint
      - run: npx ng test ngx-seo-meta --watch=false
      - run: npx ng build ngx-seo-meta
```

- [ ] **Step 5: Write the release workflow**

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npx ng test ngx-seo-meta --watch=false
      - run: npx ng build ngx-seo-meta
      - run: npm publish --provenance --access public
        working-directory: dist/ngx-seo-meta
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 6: Add repository fields (needed for npm provenance)**

Get the GitHub login: `gh api user -q .login`. Add to `projects/ngx-seo-meta/package.json` (replace `LOGIN` with the output):

```json
"repository": { "type": "git", "url": "git+https://github.com/LOGIN/ngx-seo-meta.git" },
"homepage": "https://github.com/LOGIN/ngx-seo-meta#readme",
"bugs": { "url": "https://github.com/LOGIN/ngx-seo-meta/issues" }
```

- [ ] **Step 7: Verify the package contents**

Run: `npx ng build ngx-seo-meta && cd dist/ngx-seo-meta && npm pack --dry-run && cd -`
Expected: tarball list includes `README.md`, `LICENSE`, `package.json`, `fesm2022/ngx-seo-meta.mjs`, `index.d.ts`; no `*.spec` files.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: add README, changelog, license and CI/release workflows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the plan (requires explicit user approval, not part of execution)

- Create the GitHub repository and push (`gh repo create`).
- Add `NPM_TOKEN` secret; tag `v0.1.0` to publish.
- Migrate SP2RYM to the package (separate plan).
