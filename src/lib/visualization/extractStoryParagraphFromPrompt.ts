/** Matches `buildIllustrationPrompt` in visualization page + image-generation storybook service. */
const SCENE_MARKER = 'scene to illustrate:';

/**
 * Returns only the story paragraph shown to readers — the line after "scene to illustrate:",
 * without trailing instruction lines ("Focus on…", "Style:…", etc.).
 */
export function extractStoryParagraphFromIllustrationPrompt(fullPrompt: string): string {
  const p = (fullPrompt ?? '').trim();
  if (!p) return '';

  const lower = p.toLowerCase();
  const i = lower.indexOf(SCENE_MARKER);
  if (i === -1) {
    return p.slice(0, 1200);
  }

  const afterMarker = p.slice(i + SCENE_MARKER.length);
  const lineBreak = afterMarker.search(/\r?\n/);
  const firstLine = (lineBreak === -1 ? afterMarker : afterMarker.slice(0, lineBreak)).trim();
  return firstLine || p.slice(0, 1200);
}
