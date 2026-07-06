import { createHash } from 'crypto';
import { GenerateImageRequestDTO } from '../types/dtos';

export function generateCacheKey(request: GenerateImageRequestDTO): string {
  const parts = [
    request.storyId || '',
    request.prompt.trim().toLowerCase(),
    request.style || 'default',
    request.theme || 'default',
    request.ageGroup || 'default',
    String(request.numImages || 1),
    String(request.paragraphIndex ?? ''),
  ];

  const normalized = parts.join('::');
  return `img:${createHash('sha256').update(normalized).digest('hex').slice(0, 32)}`;
}
