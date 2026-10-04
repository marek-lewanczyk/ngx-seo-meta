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

  it.each([
    '/relative',
    'example.com',
    'ftp://example.com',
    'https://example.com/app',
    'https://example.com/?x=1',
    'https://example.com/#a',
  ])('rejects baseUrl %s', (baseUrl) => {
    TestBed.configureTestingModule({ providers: [provideSeo({ baseUrl, siteName: 'X' })] });
    expect(() => TestBed.inject(SEO_CONFIG)).toThrowError(/\[ngx-seo-meta\].*baseUrl/);
  });

  it('accepts an origin with a trailing slash', () => {
    TestBed.configureTestingModule({ providers: [provideSeo({ baseUrl: 'https://example.com/', siteName: 'X' })] });
    expect(TestBed.inject(SEO_CONFIG).baseUrl).toBe('https://example.com/');
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
