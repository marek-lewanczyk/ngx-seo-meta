import { serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('serializes a plain object', () => {
    expect(serializeJsonLd({ '@type': 'Thing', name: 'A' })).toBe('{"@type":"Thing","name":"A"}');
  });

  it('escapes characters that could break out of the script element', () => {
    const name = '</script><script>alert(1)</script> & \u2028\u2029';
    const out = serializeJsonLd({ name })!;

    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual({ name });
  });

  it('returns null for a cyclic object', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(serializeJsonLd(value)).toBeNull();
  });

  it('returns null for a BigInt value', () => {
    expect(serializeJsonLd({ n: 1n })).toBeNull();
  });
});