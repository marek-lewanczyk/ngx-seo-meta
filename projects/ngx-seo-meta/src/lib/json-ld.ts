import { JsonLd } from './types';

const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
};

// Add Unicode characters dynamically to avoid parsing issues
ESCAPES[String.fromCharCode(0x2028)] = '\\u2028';
ESCAPES[String.fromCharCode(0x2029)] = '\\u2029';

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
  const ls = String.fromCharCode(0x2028);
  const ps = String.fromCharCode(0x2029);
  const regex = new RegExp('[<>&' + ls + ps + ']', 'g');
  return json.replace(regex, (char) => ESCAPES[char] || char);
}
