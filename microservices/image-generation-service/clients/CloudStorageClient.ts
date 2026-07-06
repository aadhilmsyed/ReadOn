import { Storage } from '@google-cloud/storage';
import { Logger } from '../utils/logger';

export interface UploadImageOptions {
  storyId: string;
  paragraphIndex: number;
  generationId: string;
  imageBuffer: Buffer;
}

export class CloudStorageClient {
  private storage: Storage;
  private bucketName: string;
  private logger: Logger;

  constructor() {
    // On Cloud Run, credentials are automatically provided via the service account
    // Locally, use GOOGLE_APPLICATION_CREDENTIALS file if provided
    const storageOptions: { projectId?: string; keyFilename?: string } = {};
    
    if (process.env.GCP_PROJECT_ID) {
      storageOptions.projectId = process.env.GCP_PROJECT_ID;
    }
    
    // Only use keyFilename if explicitly provided (local development)
    // On Cloud Run, omit this to use the attached service account
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    
    this.storage = new Storage(storageOptions);
    this.bucketName = process.env.READON_STORAGE_BUCKET || 'readon-ai-assets';
    this.logger = new Logger('CloudStorageClient');
  }

  /**
   * Upload image to GCS following the path structure:
   * visualization/stories/{storyId}/paragraphs/{paragraphIndex}/{generationId}.png
   */
  async uploadImage(options: UploadImageOptions): Promise<string> {
    const { storyId, paragraphIndex, generationId, imageBuffer } = options;
    
    const filePath = `visualization/stories/${storyId}/paragraphs/${paragraphIndex}/${generationId}.png`;
    
    this.logger.info('Uploading image to GCS', { filePath, size: imageBuffer.length });

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
          metadata: {
            storyId,
            paragraphIndex: paragraphIndex.toString(),
            generationId,
            uploadedAt: new Date().toISOString(),
          },
        },
        // Note: Don't use public: true with uniform bucket-level access
        // Bucket should be configured with allUsers:objectViewer for public access
      });

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      
      this.logger.info('Image uploaded successfully', { publicUrl });
      
      return publicUrl;
    } catch (error) {
      this.logger.error('Failed to upload image to GCS', error as Error);
      throw new Error(`Cloud storage upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Download image from a URL (e.g., OpenAI's temporary URL)
   */
  async downloadImage(url: string): Promise<Buffer> {
    this.logger.info('Downloading image from URL', { url: url.substring(0, 100) });

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      this.logger.info('Image downloaded successfully', { size: buffer.length });
      
      return buffer;
    } catch (error) {
      this.logger.error('Failed to download image', error as Error);
      throw new Error(`Image download failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete image from GCS
   */
  async deleteImage(filePath: string): Promise<void> {
    this.logger.info('Deleting image from GCS', { filePath });

    try {
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(filePath).delete();
      
      this.logger.info('Image deleted successfully', { filePath });
    } catch (error) {
      this.logger.error('Failed to delete image from GCS', error as Error);
      throw new Error(`Cloud storage delete failed: ${(error as Error).message}`);
    }
  }
}
