import { GriffelStyle } from '@griffel/core';
import { parseStringWithUrl } from './parseStringWithUrl';

/**
 * Linaria v3 emits relative paths for assets, we normalize these paths to be relative from the project root to be the
 * same if an assets was used in different files.
 */
export function normalizeAssetPath(path: typeof import('path'), projectRoot: string, filename: string, asset: string) {
  const absoluteAssetPath = path.resolve(path.dirname(filename), asset);

  // Normalize paths to be POSIX-like to be independent of an execution environment
  return path.relative(projectRoot, absoluteAssetPath).split(path.sep).join(path.posix.sep);
}

export function normalizeStyleRule(
  path: typeof import('path'),
  projectRoot: string,
  filename: string,
  ruleValue: string | number,
) {
  if (typeof ruleValue === 'number' || ruleValue.indexOf('url(') === -1) {
    return ruleValue;
  }

  const result = parseStringWithUrl(ruleValue);
  // Quotes in URL are optional, so we can also normalize them
  // https://www.w3.org/TR/CSS2/syndata.html#value-def-uri
  const url = result.url.replace(/['|"](.+)['|"]/, '$1');

  if (url.startsWith('data:')) {
    return `${result.prefix}${url}${result.suffix}`;
  }

  return `${result.prefix}${normalizeAssetPath(path, projectRoot, filename, url)}${result.suffix}`;
}

export function normalizeStyleRules(
  path: typeof import('path'),
  projectRoot: string,
  filename: string,
  stylesBySlots: Record<string /* slot */, GriffelStyle> | GriffelStyle,
): Record<string /* slot */, GriffelStyle> {
  return Object.fromEntries(
    Object.entries(stylesBySlots).map(([key, value]) => {
      if (typeof value === 'undefined') {
        return [key, value];
      }

      // Fallback value
      if (Array.isArray(value)) {
        return [key, value.map(rule => normalizeStyleRule(path, projectRoot, filename, rule as string))];
      }

      // Nested objects
      if (typeof value === 'object') {
        return [key, normalizeStyleRules(path, projectRoot, filename, value as unknown as GriffelStyle)];
      }

      return [key, normalizeStyleRule(path, projectRoot, filename, value)];
    }),
  );
}
