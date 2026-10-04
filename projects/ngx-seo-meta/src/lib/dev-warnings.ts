import { HeadIssue } from './build-head';
import { normalizeImage } from './merge';
import { SeoMetadata } from './types';

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

/** Non-blocking SEO quality checks for merged metadata. */
export function qualityHints(metadata: SeoMetadata): string[] {
  const hints: string[] = [];
  const { title, description } = metadata;

  if (title && title.length > MAX_TITLE) {
    hints.push(`Title has ${title.length} characters; search engines usually truncate after ~${MAX_TITLE}.`);
  }
  if (description && description.length > MAX_DESCRIPTION) {
    hints.push(
      `Description has ${description.length} characters; search engines usually truncate after ~${MAX_DESCRIPTION}.`,
    );
  }
  const image = normalizeImage(metadata.image);
  if (image && !image.alt) {
    hints.push(`Image "${image.url}" has no alt text.`);
  }
  if (metadata.type === 'product' && !metadata.product) {
    hints.push('og:type is "product" but no product data was given; product:* tags will be missing.');
  }
  return hints;
}

export function reportIssues(issues: HeadIssue[]): void {
  for (const issue of issues) {
    console[issue.level](`[ngx-seo-meta] ${issue.message}`);
  }
}
