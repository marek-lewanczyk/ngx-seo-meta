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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            seo.ɵsetRouteMetadata(routeMetadata(event, options));
          }
        });
        inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
      }),
    ],
  };
}
