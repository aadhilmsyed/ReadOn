import { IImageMetadataRepository } from './IImageMetadataRepository';
import { ImageGenerationMetadata } from '../models/ImageGenerationMetadata';
import { StorageError } from '../errors/ImageGenerationError';

export class InMemoryImageMetadataRepository implements IImageMetadataRepository {
  private storage: Map<string, ImageGenerationMetadata> = new Map();

  async save(metadata: ImageGenerationMetadata): Promise<void> {
    try {
      this.storage.set(metadata.id, { ...metadata });
    } catch (error) {
      throw new StorageError(`Failed to save metadata: ${error}`);
    }
  }

  async findById(id: string): Promise<ImageGenerationMetadata | null> {
    const metadata = this.storage.get(id);
    return metadata ? { ...metadata } : null;
  }

  async findByStoryId(storyId: string): Promise<ImageGenerationMetadata[]> {
    return Array.from(this.storage.values())
      .filter((m) => m.storyId === storyId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async update(id: string, updates: Partial<ImageGenerationMetadata>): Promise<void> {
    try {
      const existing = this.storage.get(id);
      if (!existing) {
        throw new StorageError(`Metadata with id ${id} not found`);
      }
      
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      
      this.storage.set(id, updated);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(`Failed to update metadata: ${error}`);
    }
  }
}
