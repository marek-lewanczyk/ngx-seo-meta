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
