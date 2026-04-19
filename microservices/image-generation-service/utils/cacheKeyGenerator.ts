import { GenerateImageRequestDTO } from '../types/dtos';

export function generateCacheKey(request: GenerateImageRequestDTO): string {
  const parts = [
    request.prompt.trim().toLowerCase(),
    request.style || 'default',
    request.theme || 'default',
    request.ageGroup || 'default',
    request.numImages || 1,
  ];

  const normalized = parts.join('::');
  return `img:${hashString(normalized)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
