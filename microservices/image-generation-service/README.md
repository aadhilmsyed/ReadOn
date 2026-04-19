# Image Generation Service

This microservice handles image generation for the ReadOn story-learning application using the **Proxy Pattern**.

## Architecture

```
┌─────────────────────┐
│  Controller         │  ← HTTP request handling
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  IImageGeneration   │  ← Service Interface (Subject)
│  Service            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ImageGeneration    │  ← Proxy (caching, logging, rate limiting, metadata)
│  Proxy              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  RealImageGeneration│  ← Real Subject (retry logic, provider call)
│  Service            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ExternalAIImage    │  ← Provider-specific client (isolated)
│  Client             │
└─────────────────────┘
```

## Proxy Pattern Benefits

- **Decoupling**: Controller depends only on `IImageGenerationService` interface
- **Caching**: Proxy checks cache before calling real service
- **Rate Limiting**: Proxy enforces rate limits
- **Logging**: Centralized structured logging
- **Metadata**: Proxy manages persistence
- **Provider Isolation**: External provider details hidden in `ExternalAIImageClient`

## API Endpoints

### POST `/images/generate`

Generate images from a prompt.

**Request:**
```json
{
  "storyId": "story-123",
  "userId": "user-456",
  "prompt": "A friendly dragon reading a book with children",
  "style": "cartoon",
  "numImages": 1
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "req-abc123",
  "storyId": "story-123",
  "status": "COMPLETED",
  "images": [
    {
      "url": "https://storage.example.com/generated/image.png",
      "provider": "external-ai-provider"
    }
  ],
  "cached": false
}
```

### GET `/images/:requestId`

Get status of a generation request.

## Components

| Component | Responsibility |
|-----------|----------------|
| `IImageGenerationService` | Service interface (Subject) |
| `ImageGenerationProxy` | Caching, logging, rate limiting, metadata |
| `RealImageGenerationService` | External provider calls with retry |
| `ExternalAIImageClient` | Provider-specific API integration |
| `IImageMetadataRepository` | Metadata persistence abstraction |
| `IImageGenerationCache` | Cache abstraction |
| `RateLimiter` | Rate limiting utility |
| `Logger` | Structured logging |

## Configuration

Set environment variables:
- `AI_IMAGE_API_KEY` - External provider API key
- `AI_IMAGE_API_ENDPOINT` - External provider endpoint

## Flow

1. Request → Controller
2. Controller → Proxy (via interface)
3. Proxy validates request
4. Proxy checks cache (deterministic key)
5. If cached → return cached result
6. If not cached:
   - Check rate limit
   - Save initial metadata
   - Call RealService
   - RealService retries on transient failures
   - Update metadata
   - Cache successful result
7. Return structured response
