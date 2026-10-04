# ngx-seo-meta

Typed, SSR-ready SEO for Angular: document title, meta tags, Open Graph, Twitter Card, canonical and `hreflang` links, and JSON-LD — set from route data or from a service.

- Works with SSR, prerendering, hydration and zoneless apps
- Cleans up after every navigation — no stale tags from the previous page
- JSON-LD is escaped; only `http(s)` URLs are accepted
- Angular 21

## Install

```bash
npm install ngx-seo-meta
```

## Setup

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideSeo, withRouteSeo } from 'ngx-seo-meta';

import { routes } from './app.routes';

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

`baseUrl` must be an origin such as `https://example.com` (no path, query or hash); apps served under a sub-path are not supported in 0.1.

The config may also be a factory running in an injection context:

```ts
import { inject } from '@angular/core';

provideSeo(() => ({ baseUrl: inject(SITE_URL), siteName: 'Example' }));
```

## Route data

```ts
import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { SeoMetadata } from 'ngx-seo-meta';
import { map } from 'rxjs';

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

`withRouteSeo()` applies `data.seo` at `ResolveEnd` (before components are created). Without `data.seo` the page gets `defaults` plus the route `title` and the derived canonical URL. The canonical URL is derived from the router URL without query and fragment; disable with `withRouteSeo({ canonical: false })`.

## Service

```ts
import { inject } from '@angular/core';
import { SeoService } from 'ngx-seo-meta';

const seo = inject(SeoService);

seo.update({ title: 'Product', description: '…' }); // replaces the component layer
seo.patch({ image: { url: '/p.jpg', alt: '…' } });  // merges into the component layer
```

Metadata is kept in layers:

- **Route layer** — set by `withRouteSeo()` on each navigation (from `data.seo`, resolvers, the route `title` and the derived canonical URL). Each navigation also clears the component layer.
- **Component layer** — `update()` replaces it, `patch()` merges into it. Its fields override route fields; route canonical, `og:url` and resolver data stay unless overridden.
- **Defaults** — from `provideSeo()`, underneath both.

Component `jsonLd` replaces route `jsonLd`; default `jsonLd` is always kept.

## Merge rules

- Rendered metadata = `defaults` merged with (route layer merged with component layer).
- `undefined` means "not set"; `null` clears a default (e.g. `image: null`).
- `twitter`, `article`, `product` merge one level deep; `image` replaces as a whole.
- `jsonLd` from defaults and the page are combined; component `jsonLd` replaces route `jsonLd`, and within `patch()` it is replaced too.

## Rendered tags

| Field | Output |
|---|---|
| `title` | `<title>` (templated; `siteName` when there is no title), `og:title`, `twitter:title` |
| `description` | `description`, `og:description`, `twitter:description` |
| `url` | `og:url`, `<link rel="canonical">` |
| `image` | `og:image`, `og:image:alt`, `og:image:width/height`, `twitter:image`, `twitter:image:alt` |
| `type` | `og:type` (inferred: `product` → `article` → `website`) |
| `article` | `article:published_time`, `modified_time`, `author`, `section`, `tag` |
| `product` | `product:price:amount`, `product:price:currency`, `product:availability` |
| `robots`, `author` | `robots`, `author` |
| `twitter` | `twitter:card` (default `summary_large_image` with an image, else `summary`), `twitter:site`, `twitter:creator` |
| `locale`, `localeAlternates` | `og:locale`, `og:locale:alternate` |
| `alternates` | `<link rel="alternate" hreflang>` |
| `jsonLd` | `<script type="application/ld+json">` per item |
| `extraTags` | any meta tag, as given (tags with invalid attribute names are skipped with a dev warning) |
| config `siteName` | `og:site_name` (always rendered) |

Every element created by the library carries `data-ngx-seo`. Tags it does not manage are never touched; an unmarked tag with the same key (e.g. a static `description` in `index.html`) is replaced.

## Notes and limitations

- `withRouteSeo()` replaces Angular's `TitleStrategy`: the title is set by ngx-seo-meta with the template. A custom `TitleStrategy` provided later would override it.
- When the router reuses a component (same route, new `:id`), route SEO is re-applied on each navigation and the component layer is cleared. Components that call `update()` must do it on every param change (e.g. in an `effect()` reading the input or param), not only in the constructor.
- If a navigation is cancelled after its resolvers ran (`ResolveEnd`), tags reflect the cancelled target until the next navigation.

## Development

```bash
npm ci
npx ng test ngx-seo-meta
npx ng build ngx-seo-meta
```

`projects/ngx-seo-meta/README.md` and `LICENSE` are git symlinks to the root files. On Windows, enable them with `git config core.symlinks true` before cloning (or re-checkout afterwards).

## License

MIT
