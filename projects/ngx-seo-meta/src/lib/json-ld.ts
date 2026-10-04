import { JsonLd } from './types';

const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serializes JSON-LD so it is safe inside `<script type="application/ld+json">`.
 * Returns null when the value cannot be serialized (cycles, BigInt).
 */
export function serializeJsonLd(value: JsonLd): string | null {
  let json: string | undefined;
  try {
    json = JSON.stringify(value);
  } catch {
    return null;
  }
  if (json === undefined) {
    return null;
  }
  return json.replace(/[<>&\u2028\u2029]/g, (char) => ESCAPES[char]);
}
