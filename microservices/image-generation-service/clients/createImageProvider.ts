import { config } from '../config';
import type { IImageProvider } from './IImageProvider';
import { OpenAIImageClient } from './OpenAIImageClient';
import { VertexGeminiImageClient } from './VertexGeminiImageClient';

export function createImageProvider(): IImageProvider {
  const provider = (config.aiProvider.provider || 'vertex').toLowerCase();
  if (provider === 'openai') {
    return new OpenAIImageClient();
  }
  return new VertexGeminiImageClient();
}
