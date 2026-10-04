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
