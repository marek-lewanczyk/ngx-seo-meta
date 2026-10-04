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
