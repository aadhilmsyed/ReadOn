import { Pool } from 'pg';
import { IImageMetadataRepository } from './IImageMetadataRepository';
import { ImageGenerationMetadata } from '../models/ImageGenerationMetadata';
import { GenerationStatus, ImageProvider } from '../types/enums';
import { config } from '../config';

export class PostgresImageMetadataRepository implements IImageMetadataRepository {
  private pool: Pool;

  constructor(databaseConfig = config.database) {
    this.pool = new Pool({
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.name,
      user: databaseConfig.user,
      password: databaseConfig.password,
      ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async save(metadata: ImageGenerationMetadata): Promise<void> {
    const query = `
      INSERT INTO Image_Generation_Metadata (
        Generation_ID, Story_ID, User_ID, Prompt, Style, Theme, Age_Group,
        Num_Images, Status, Provider, Image_URLs, Storage_Keys, Cached,
        Error_Message, Created_At, Updated_At
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (Generation_ID) DO UPDATE SET
        Story_ID = EXCLUDED.Story_ID,
        User_ID = EXCLUDED.User_ID,
        Prompt = EXCLUDED.Prompt,
        Style = EXCLUDED.Style,
        Theme = EXCLUDED.Theme,
        Age_Group = EXCLUDED.Age_Group,
        Num_Images = EXCLUDED.Num_Images,
        Status = EXCLUDED.Status,
        Provider = EXCLUDED.Provider,
        Image_URLs = EXCLUDED.Image_URLs,
        Storage_Keys = EXCLUDED.Storage_Keys,
        Cached = EXCLUDED.Cached,
        Error_Message = EXCLUDED.Error_Message,
        Updated_At = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      metadata.id,
      metadata.storyId || null,
      metadata.userId || null,
      metadata.prompt,
      metadata.style || null,
      metadata.theme || null,
      metadata.ageGroup || null,
      metadata.numImages,
      metadata.status,
      metadata.provider,
      metadata.imageUrls,
      metadata.storageKeys || null,
      metadata.cached,
      metadata.errorMessage || null,
      metadata.createdAt,
      metadata.updatedAt,
    ]);
  }

  async findById(id: string): Promise<ImageGenerationMetadata | null> {
    const result = await this.pool.query(
      'SELECT * FROM Image_Generation_Metadata WHERE Generation_ID = $1',
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.generation_id,
      storyId: row.story_id,
      userId: row.user_id,
      prompt: row.prompt,
      style: row.style,
      theme: row.theme,
      ageGroup: row.age_group,
      numImages: row.num_images,
      status: row.status as GenerationStatus,
      provider: row.provider as ImageProvider,
      imageUrls: row.image_urls || [],
      storageKeys: row.storage_keys,
      cached: row.cached,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async update(id: string, updates: Partial<ImageGenerationMetadata>): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`Status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.imageUrls !== undefined) {
      setClauses.push(`Image_URLs = $${paramIndex++}`);
      values.push(updates.imageUrls);
    }

    if (updates.errorMessage !== undefined) {
      setClauses.push(`Error_Message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    if (updates.cached !== undefined) {
      setClauses.push(`Cached = $${paramIndex++}`);
      values.push(updates.cached);
    }

    if (setClauses.length === 0) return;

    setClauses.push(`Updated_At = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE Image_Generation_Metadata
      SET ${setClauses.join(', ')}
      WHERE Generation_ID = $${paramIndex}
    `;
    
    await this.pool.query(query, values);
  }

  async findByStoryId(storyId: string): Promise<ImageGenerationMetadata[]> {
    const result = await this.pool.query(
      'SELECT * FROM Image_Generation_Metadata WHERE Story_ID = $1 ORDER BY Created_At DESC',
      [storyId]
    );
    
    return result.rows.map(row => ({
      id: row.generation_id,
      storyId: row.story_id,
      userId: row.user_id,
      prompt: row.prompt,
      style: row.style,
      theme: row.theme,
      ageGroup: row.age_group,
      numImages: row.num_images,
      status: row.status as GenerationStatus,
      provider: row.provider as ImageProvider,
      imageUrls: row.image_urls || [],
      storageKeys: row.storage_keys,
      cached: row.cached,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findByUserId(userId: string): Promise<ImageGenerationMetadata[]> {
    const result = await this.pool.query(
      'SELECT * FROM Image_Generation_Metadata WHERE User_ID = $1 ORDER BY Created_At DESC',
      [userId]
    );
    
    return result.rows.map(row => ({
      id: row.generation_id,
      storyId: row.story_id,
      userId: row.user_id,
      prompt: row.prompt,
      style: row.style,
      theme: row.theme,
      ageGroup: row.age_group,
      numImages: row.num_images,
      status: row.status as GenerationStatus,
      provider: row.provider as ImageProvider,
      imageUrls: row.image_urls || [],
      storageKeys: row.storage_keys,
      cached: row.cached,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async checkConnection(): Promise<void> {
    await this.pool.query('SELECT 1');
  }
}
