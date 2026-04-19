import { ImageGenerationMetadata } from '../models/ImageGenerationMetadata';

export interface IImageMetadataRepository {
  save(metadata: ImageGenerationMetadata): Promise<void>;
  findById(id: string): Promise<ImageGenerationMetadata | null>;
  update(id: string, updates: Partial<ImageGenerationMetadata>): Promise<void>;
}
