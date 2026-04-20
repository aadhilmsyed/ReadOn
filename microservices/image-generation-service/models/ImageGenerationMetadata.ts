import { GenerationStatus, ImageProvider } from '../types/enums';

export interface ImageGenerationMetadata {
  id: string;
  storyId?: string;
  userId?: string;
  prompt: string;
  style?: string;
  theme?: string;
  ageGroup?: string;
  status: GenerationStatus;
  provider: ImageProvider;
  imageUrls: string[];
  storageKeys?: string[];
  cached: boolean;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
  numImages: number;
}

export function createImageGenerationMetadata(
  id: string,
  prompt: string,
  options: {
    storyId?: string;
    userId?: string;
    style?: string;
    theme?: string;
    ageGroup?: string;
    numImages?: number;
  }
): ImageGenerationMetadata {
  return {
    id,
    storyId: options.storyId,
    userId: options.userId,
    prompt,
    style: options.style,
    theme: options.theme,
    ageGroup: options.ageGroup,
    status: GenerationStatus.PENDING,
    provider: ImageProvider.EXTERNAL_AI_PROVIDER,
    imageUrls: [],
    cached: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    numImages: options.numImages || 1,
  };
}
