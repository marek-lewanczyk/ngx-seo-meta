import { Component } from '@angular/core';
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { provideRouter, RouterOutlet } from '@angular/router';

import { provideSeo, withRouteSeo } from '../public-api';

// eslint-disable-next-line @angular-eslint/component-selector
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
