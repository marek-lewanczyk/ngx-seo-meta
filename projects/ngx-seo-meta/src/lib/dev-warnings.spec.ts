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
