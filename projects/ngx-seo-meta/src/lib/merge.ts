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
