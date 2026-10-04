# Changelog

## 0.1.0 — unreleased

- `provideSeo()` with static or factory config and `defaults`
- `SeoService.update()` / `patch()`
- Route and component SEO layers: component `update()`/`patch()` override route data without dropping it
- `withRouteSeo()`: `data.seo`, resolvers, route `title`, automatic canonical
- Title template, robots, Open Graph (website/article/product/profile), Twitter Card
- Canonical, `hreflang` alternates, `og:locale:alternate`
- JSON-LD with safe escaping
- Ownership markers (`data-ngx-seo`) for clean SSR hydration
- Requires Angular 21
