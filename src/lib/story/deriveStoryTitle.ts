/** Max length for stored/displayed story titles (matches UI and API). */
export const STORY_TITLE_MAX_LENGTH = 100;

export function deriveStoryTitle(sourceText: string, explicitTitle?: string | null): string {
  const ex = (explicitTitle ?? '').trim();
  if (ex) return ex.slice(0, STORY_TITLE_MAX_LENGTH);
  const firstLine = sourceText.trim().split(/\n/)[0]?.trim() || '';
  const words = firstLine.replace(/\s+/g, ' ').trim() || 'Untitled story';
  return words.slice(0, STORY_TITLE_MAX_LENGTH);
}
