# Image Generation Feature - Implementation Checklist

## ✅ Phase 1: Core Implementation (COMPLETED)

**Status:** All components implemented with Proxy Pattern

- [x] Create DTOs and types
- [x] Create enums (Status, ErrorCode, Provider)
- [x] Create domain model (ImageGenerationMetadata)
- [x] Create error classes hierarchy
- [x] Create repository interface and in-memory implementation
- [x] Create cache interface and in-memory implementation
- [x] Create utilities (cache key, retry, rate limiter, logger, request ID)
- [x] Create external AI client
- [x] Create service interface (IImageGenerationService)
- [x] Create RealImageGenerationService
- [x] Create ImageGenerationProxy (Proxy Pattern)
- [x] Create ImageGenerationController (class-based with DI)
- [x] Create routes
- [x] Create documentation (README, IMPLEMENTATION)

---

## ✅ Phase 2: Database Setup - Google Cloud SQL PostgreSQL (COMPLETED)

### 2.1 Set Up Cloud SQL PostgreSQL Instance
- [x] Go to Google Cloud Console → SQL
- [x] Click "Create Instance" → Choose PostgreSQL
- [ ] Configure instance:
  - Instance ID: `readon-image-generation-db` (unique per microservice)
  - Password: Set a strong password for `postgres` user
  - Region: Choose closest to your app (e.g., `us-central1`)
  - Database version: PostgreSQL 15 (recommended)
  - Machine type: Start with `db-f1-micro` (free tier eligible) or `db-g1-small`
  - Storage: 10 GB SSD (auto-increase enabled)
- [ ] Under "Connections" → Enable "Public IP" (for development)
- [ ] Add your IP to "Authorized networks" for testing
- [ ] Click "Create" and wait ~5-10 minutes

**Note:** Each microservice should have its own database instance for proper isolation:
- `readon-image-generation-db` - Image Generation Service
- `readon-audiobook-db` - Audiobook Service
- `readon-comprehension-db` - Comprehension Service
- `readon-phonics-db` - Phonics Service
- etc.

### 2.2 Create Database and Schema
- [ ] Once instance is running, click "Databases" tab
- [ ] Create new database: `image_generation` (specific to this service)
- [ ] Connect using Cloud Shell or local `psql`:
```bash
# Option 1: Using gcloud CLI
gcloud sql connect readon-image-generation-db --user=postgres --database=image_generation

# Option 2: Using psql with public IP
psql "host=YOUR_INSTANCE_IP dbname=image_generation user=postgres password=YOUR_PASSWORD sslmode=require"
```
- [ ] Run the schema creation script:
```sql
CREATE TABLE Image_Generation_Metadata (
  Generation_ID        VARCHAR(255) PRIMARY KEY,
  Story_ID             VARCHAR(255),
  User_ID              VARCHAR(255),
  Prompt               TEXT NOT NULL,
  Style                VARCHAR(100),
  Theme                VARCHAR(100),
  Age_Group            VARCHAR(50),
  Num_Images           INTEGER DEFAULT 1,
  Status               VARCHAR(50) NOT NULL,
  Provider             VARCHAR(100) NOT NULL,
  Image_URLs           TEXT[],
  Storage_Keys         TEXT[],
  Cached               BOOLEAN DEFAULT FALSE,
  Error_Message        TEXT,
  Created_At           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Updated_At           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_story_id ON Image_Generation_Metadata(Story_ID);
CREATE INDEX idx_user_id ON Image_Generation_Metadata(User_ID);
CREATE INDEX idx_status ON Image_Generation_Metadata(Status);
CREATE INDEX idx_created_at ON Image_Generation_Metadata(Created_At);
```
- [ ] Verify table created: `\dt` and `\d Image_Generation_Metadata`

### 2.3 Configure Connection in Your App
- [ ] Install PostgreSQL client: `npm install pg @types/pg`
- [ ] Get connection details from Cloud SQL:
  - Instance connection name: `PROJECT_ID:REGION:readon-image-generation-db`
  - Public IP address
  - Database name: `image_generation`
  - Username: `postgres`
  - Password: (what you set)
- [ ] Add to `.env`:
```bash
DB_HOST=YOUR_CLOUD_SQL_PUBLIC_IP
DB_PORT=5432
DB_NAME=image_generation
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=true
```

### 2.4 Implement PostgreSQL Repository
- [ ] Create `PostgresImageMetadataRepository.ts` implementing `IImageMetadataRepository`
- [ ] Set up connection pool with SSL
- [ ] Implement `save()` method with array handling
- [ ] Implement `findById()` method
- [ ] Implement `update()` method
- [ ] Add proper error handling
- [ ] Test connection on startup

**File to create:**
```
repositories/PostgresImageMetadataRepository.ts
```

**Implementation example:**
```typescript
import { Pool } from 'pg';
import { IImageMetadataRepository } from './IImageMetadataRepository';
import { ImageGenerationMetadata } from '../models/ImageGenerationMetadata';

export class PostgresImageMetadataRepository implements IImageMetadataRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async save(metadata: ImageGenerationMetadata): Promise<void> {
    const query = `
      INSERT INTO Image_Generation_Metadata (
        Generation_ID, Story_ID, User_ID, Prompt, Style, Theme, Age_Group,
        Num_Images, Status, Provider, Image_URLs, Storage_Keys, Cached,
        Error_Message, Created_At, Updated_At
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      status: row.status,
      provider: row.provider,
      imageUrls: row.image_urls || [],
      storageKeys: row.storage_keys,
      cached: row.cached,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async update(id: string, updates: Partial<ImageGenerationMetadata>): Promise<void> {
    const query = `
      UPDATE Image_Generation_Metadata
      SET Status = COALESCE($2, Status),
          Image_URLs = COALESCE($3, Image_URLs),
          Error_Message = COALESCE($4, Error_Message),
          Updated_At = CURRENT_TIMESTAMP
      WHERE Generation_ID = $1
    `;
    
    await this.pool.query(query, [
      id,
      updates.status,
      updates.imageUrls,
      updates.errorMessage,
    ]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

---

## ✅ Phase 3: External AI Provider Integration (COMPLETED)

### 3.1 Choose AI Provider
- [x] Decide: OpenAI DALL-E, Stability AI, Midjourney, or other?
- [x] Sign up and get API key
- [x] Review API documentation and pricing

### 3.2 Configure API Credentials
- [x] Create `.env` file in microservice root
- [x] Add `AI_IMAGE_API_KEY=your_key_here`
- [x] Add `AI_IMAGE_API_ENDPOINT=https://api.provider.com/v1/images`
- [x] Add `.env` to `.gitignore`

### 3.3 Update ExternalAIImageClient
- [x] Update API endpoint in `ExternalAIImageClient.ts`
- [x] Update request body format to match provider's API
- [x] Update response parsing to match provider's response
- [x] Test with real API calls
- [x] Handle provider-specific errors

**Example for OpenAI DALL-E:**
```typescript
// Update makeRequest() in ExternalAIImageClient.ts
body: JSON.stringify({
  model: "dall-e-3",
  prompt: request.prompt,
  n: request.numImages,
  size: "1024x1024"
})
```

---

## ✅ Phase 4: Cache Implementation (COMPLETED - In-Memory)

### 4.1 Choose Cache Solution
- [ ] Decide: Redis, Memcached, or keep in-memory?
- [ ] If Redis: Set up Redis instance
- [ ] Install Redis client: `npm install redis @types/redis`

### 4.2 Implement Redis Cache (if chosen)
- [ ] Create `RedisImageCache.ts` implementing `IImageGenerationCache`
- [ ] Implement `get()` method
- [ ] Implement `set()` with TTL
- [ ] Implement `delete()` method
- [ ] Add connection error handling
- [ ] Test cache operations

**File to create:**
```
cache/RedisImageCache.ts
```

---

## ✅ Phase 5: HTTP Server Setup (COMPLETED)

### 5.1 Choose Framework
- [ ] Decide: Express, Fastify, or NestJS?
- [ ] Install dependencies: `npm install express @types/express`

### 5.2 Create HTTP Server
- [ ] Create `server.ts` or `app.ts` in microservice root
- [ ] Set up Express app
- [ ] Add body parser middleware
- [ ] Add CORS middleware (if needed)
- [ ] Add error handling middleware
- [ ] Define routes using `imageGenerationRoutes()`

**File to create:**
```typescript
// server.ts
import express from 'express';
import { imageGenerationRoutes } from './routes';

const app = express();
app.use(express.json());

app.post('/images/generate', async (req, res) => {
  const result = await imageGenerationRoutes('POST', '/images/generate', req.body);
  res.status(result.status).json(result.body);
});

app.get('/images/:requestId', async (req, res) => {
  const result = await imageGenerationRoutes('GET', `/images/${req.params.requestId}`);
  res.status(result.status).json(result.body);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Image Generation Service running on port ${PORT}`);
});
```

### 5.3 Test HTTP Endpoints
- [ ] Start server: `npm run dev` or `ts-node server.ts`
- [ ] Test POST `/images/generate` with Postman/curl
- [ ] Test GET `/images/:requestId` with Postman/curl
- [ ] Verify error responses

---

## 🧪 Phase 6: Testing (TODO)

### 6.1 Unit Tests
- [ ] Install testing framework: `npm install --save-dev jest @types/jest ts-jest`
- [ ] Configure Jest for TypeScript
- [ ] Write tests for `ImageGenerationProxy`
- [ ] Write tests for `RealImageGenerationService`
- [ ] Write tests for `ImageGenerationController`
- [ ] Write tests for utilities (cache key, retry, rate limiter)
- [ ] Mock external dependencies
- [ ] Run tests: `npm test`

### 6.2 Integration Tests
- [ ] Test full flow with in-memory implementations
- [ ] Test caching behavior
- [ ] Test rate limiting
- [ ] Test error handling
- [ ] Test database persistence

---

## 🔒 Phase 7: Security & Configuration (TODO)

### 7.1 Environment Variables
- [ ] Create `.env.example` template
- [ ] Document all required environment variables
- [ ] Add validation for required env vars on startup

### 7.2 Security
- [ ] Add API key validation (if exposing publicly)
- [ ] Add rate limiting at HTTP level
- [ ] Sanitize user inputs
- [ ] Add request size limits
- [ ] Add timeout configurations

### 7.3 Configuration File
- [ ] Create `config.ts` for centralized configuration
- [ ] Load from environment variables
- [ ] Add default values

**File to create:**
```typescript
// config.ts
export const config = {
  port: process.env.PORT || 3001,
  aiProvider: {
    apiKey: process.env.AI_IMAGE_API_KEY || '',
    endpoint: process.env.AI_IMAGE_API_ENDPOINT || '',
    timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
  },
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'readon',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
};
```

---

## 📦 Phase 8: Dependencies & Build (TODO)

### 8.1 Package.json
- [ ] Create `package.json` in microservice directory
- [ ] Add dependencies: express, database client, cache client
- [ ] Add dev dependencies: typescript, @types/*, jest, ts-node
- [ ] Add scripts: `dev`, `build`, `test`, `start`

**Example package.json:**
```json
{
  "name": "image-generation-service",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.0"
  }
}
```

### 8.2 TypeScript Configuration
- [ ] Create `tsconfig.json` in microservice directory
- [ ] Configure output directory
- [ ] Configure module resolution

---

## 🚀 Phase 9: Deployment Preparation (TODO)

### 9.1 Docker
- [ ] Create `Dockerfile` for the microservice
- [ ] Create `docker-compose.yml` for local development
- [ ] Test Docker build
- [ ] Test Docker run

### 9.2 Logging & Monitoring
- [ ] Ensure structured logging is working
- [ ] Add request/response logging
- [ ] Add performance metrics
- [ ] Set up error tracking (optional: Sentry)

### 9.3 Health Checks
- [ ] Add `/health` endpoint
- [ ] Add `/ready` endpoint
- [ ] Check database connection
- [ ] Check cache connection

---

## 🔗 Phase 10: Integration with Main App (TODO)

### 10.1 Service Discovery
- [ ] Decide how main app will call this microservice
- [ ] Add service URL to main app configuration
- [ ] Test connectivity

### 10.2 API Client for Main App
- [ ] Create client wrapper in main app
- [ ] Handle network errors
- [ ] Add retry logic
- [ ] Add timeout handling

### 10.3 End-to-End Testing
- [ ] Test story creation → image generation flow
- [ ] Test error scenarios
- [ ] Test performance under load

---

## 📋 Quick Start Commands

```bash
# 1. Install dependencies
cd microservices/image-generation-service
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Set up database
psql -U postgres -d readon -f schema.sql

# 4. Run in development
npm run dev

# 5. Test endpoints
curl -X POST http://localhost:3001/images/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A dragon reading a book","style":"cartoon"}'

# 6. Run tests
npm test
```

---

## 🎯 Priority Order

**Week 1 - Get it working:**
1. ✅ Core implementation (DONE)
2. Database setup (PostgreSQL recommended)
3. External AI provider integration (OpenAI DALL-E recommended)
4. HTTP server setup
5. Basic testing

**Week 2 - Make it production-ready:**
6. Redis cache implementation
7. Comprehensive testing
8. Security & configuration
9. Docker setup
10. Integration with main app

---

## 📝 Notes

- Start with in-memory implementations for cache/repository to test the flow
- Switch to real database/cache once core logic is verified
- Test with a free tier AI provider first (OpenAI gives $5 free credit)
- Monitor costs - image generation can be expensive
- Consider adding image storage (S3, Cloudinary) for generated images
