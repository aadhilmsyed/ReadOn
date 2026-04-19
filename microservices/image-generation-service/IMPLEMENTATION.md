# Image Generation Service - Implementation Guide

## Design Pattern: Proxy Pattern

The Proxy Pattern provides a surrogate or placeholder for another object to control access to it.

### Pattern Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ImageGenerationController                                        │  │
│  │  - Receives HTTP requests                                         │  │
│  │  - Parses/validates request DTOs                                  │  │
│  │  - Delegates to service interface                                 │  │
│  │  - Maps results to HTTP responses                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SUBJECT INTERFACE                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  IImageGenerationService                                          │  │
│  │  + generateImage(request): Promise<Response>                      │  │
│  │  + getGenerationStatus(id): Promise<Response>                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│           PROXY                  │  │        REAL SUBJECT             │
│  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │
│  │  ImageGenerationProxy     │  │  │  │  RealImageGenerationSvc   │  │
│  │  - Validation             │──┼──▶  │  - Provider API calls     │  │
│  │  - Caching                │  │  │  │  - Retry logic            │  │
│  │  - Rate limiting          │  │  │  │  - Response mapping       │  │
│  │  - Logging                │  │  │  └───────────────────────────┘  │
│  │  - Metadata persistence   │  │  └─────────────────────────────────┘
│  └───────────────────────────┘  │
└─────────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌─────────────────────────────────┐
                                    │      EXTERNAL CLIENT            │
                                    │  ┌───────────────────────────┐  │
                                    │  │  ExternalAIImageClient    │  │
                                    │  │  - Provider-specific API  │  │
                                    │  │  - Request/response map   │  │
                                    │  └───────────────────────────┘  │
                                    └─────────────────────────────────┘
```

---

## SOLID Principles Compliance

### S - Single Responsibility Principle

| Component | Single Responsibility |
|-----------|----------------------|
| `ImageGenerationController` | HTTP request/response handling only |
| `ImageGenerationProxy` | Cross-cutting concerns (cache, rate limit, logging, metadata) |
| `RealImageGenerationService` | External provider communication with retry |
| `ExternalAIImageClient` | Provider-specific API integration |
| `IImageMetadataRepository` | Metadata persistence |
| `IImageGenerationCache` | Caching operations |
| `RateLimiter` | Rate limiting logic |
| `Logger` | Structured logging |
| `RetryPolicy` | Retry with backoff logic |

### O - Open/Closed Principle

**Open for extension, closed for modification:**

- `IImageGenerationService` interface allows new implementations without changing existing code
- `IImageMetadataRepository` can be swapped (InMemory → MongoDB → PostgreSQL)
- `IImageGenerationCache` can be swapped (InMemory → Redis)
- `ExternalAIImageClient` can be replaced for different providers

**Example - Adding a new provider:**
```typescript
// No changes to Proxy or Controller needed
class OpenAIImageClient implements IExternalImageClient { ... }
class StabilityAIImageClient implements IExternalImageClient { ... }
```

### L - Liskov Substitution Principle

All implementations are substitutable for their interfaces:

```typescript
// Any IImageGenerationService implementation works
const service: IImageGenerationService = new ImageGenerationProxy(...);
const service: IImageGenerationService = new RealImageGenerationService(...);

// Any IImageMetadataRepository implementation works
const repo: IImageMetadataRepository = new InMemoryImageMetadataRepository();
const repo: IImageMetadataRepository = new MongoImageMetadataRepository();
```

### I - Interface Segregation Principle

Interfaces are focused and minimal:

```typescript
// IImageGenerationService - only image generation operations
interface IImageGenerationService {
  generateImage(request): Promise<Response>;
  getGenerationStatus(id): Promise<Response>;
}

// IImageMetadataRepository - only persistence operations
interface IImageMetadataRepository {
  save(metadata): Promise<void>;
  findById(id): Promise<Metadata | null>;
  update(id, updates): Promise<void>;
}

// IImageGenerationCache - only cache operations
interface IImageGenerationCache {
  get(key): Promise<CachedResult | null>;
  set(key, value, ttl?): Promise<void>;
  delete(key): Promise<void>;
}
```

### D - Dependency Inversion Principle

High-level modules depend on abstractions, not concretions:

```typescript
// Controller depends on interface, not concrete class
class ImageGenerationController {
  constructor(private service: IImageGenerationService) {}
}

// Proxy depends on interfaces
class ImageGenerationProxy {
  constructor(
    private realService: IImageGenerationService,
    private cache: IImageGenerationCache | null,
    private repository: IImageMetadataRepository,
    private rateLimiter: IRateLimiter | null
  ) {}
}
```

---

## OOP Principles Applied

### Encapsulation

- Private methods in `ImageGenerationProxy` hide implementation details
- `ExternalAIImageClient` encapsulates provider-specific logic
- Error classes encapsulate error handling logic

### Abstraction

- `IImageGenerationService` abstracts image generation operations
- `IImageMetadataRepository` abstracts storage mechanism
- `IImageGenerationCache` abstracts caching mechanism

### Polymorphism

- Multiple implementations of `IImageGenerationService` (Proxy, RealService)
- Multiple implementations of `IImageMetadataRepository` (InMemory, future DB)
- Error hierarchy with `ImageGenerationError` base class

### Inheritance

```typescript
// Error class hierarchy
class ImageGenerationError extends Error { ... }
class ValidationError extends ImageGenerationError { ... }
class ProviderTimeoutError extends ImageGenerationError { ... }
class ProviderUnavailableError extends ImageGenerationError { ... }
class RateLimitError extends ImageGenerationError { ... }
class StorageError extends ImageGenerationError { ... }
```

---

## Dependency Injection

Dependencies are injected via constructor:

```typescript
// Proxy receives all dependencies
const proxy = new ImageGenerationProxy(
  realService,      // IImageGenerationService
  cache,            // IImageGenerationCache
  repository,       // IImageMetadataRepository
  rateLimiter       // RateLimiter
);

// Controller receives service
const controller = new ImageGenerationController(proxy);
```

**Benefits:**
- Testability (mock dependencies)
- Flexibility (swap implementations)
- Loose coupling

---

## File Structure

```
image-generation-service/
├── cache/
│   ├── IImageGenerationCache.ts      # Cache interface
│   └── InMemoryImageCache.ts         # In-memory implementation
├── clients/
│   └── ExternalAIImageClient.ts      # Provider-specific client
├── controllers/
│   └── ImageGenerationController.ts  # HTTP handling (class-based)
├── errors/
│   └── ImageGenerationError.ts       # Error hierarchy
├── models/
│   └── ImageGenerationMetadata.ts    # Domain model
├── repositories/
│   ├── IImageMetadataRepository.ts   # Repository interface
│   └── InMemoryImageMetadataRepository.ts
├── routes/
│   └── index.ts                      # Route registration
├── services/
│   ├── IImageGenerationService.ts    # Service interface (Subject)
│   ├── ImageGenerationProxy.ts       # Proxy implementation
│   └── RealImageGenerationService.ts # Real Subject
├── types/
│   ├── dtos.ts                       # Data Transfer Objects
│   └── enums.ts                      # Enumerations
├── utils/
│   ├── cacheKeyGenerator.ts          # Cache key utility
│   ├── logger.ts                     # Structured logging
│   ├── rateLimiter.ts                # Rate limiting
│   ├── requestIdGenerator.ts         # Request ID generation
│   └── retryPolicy.ts                # Retry with backoff
├── IMPLEMENTATION.md                 # This file
└── README.md                         # Service documentation
```

---

## Flow Diagram

```
Request → Controller
              │
              ▼
         Parse & Validate DTO
              │
              ▼
         Call Proxy (via interface)
              │
              ▼
    ┌─────────────────────────────┐
    │     ImageGenerationProxy    │
    │  ┌───────────────────────┐  │
    │  │ 1. Validate request   │  │
    │  │ 2. Check cache        │──┼──→ Cache Hit? Return cached
    │  │ 3. Check rate limit   │  │
    │  │ 4. Save metadata      │  │
    │  │ 5. Call real service  │──┼──→ RealService → ExternalClient
    │  │ 6. Update metadata    │  │
    │  │ 7. Cache result       │  │
    │  │ 8. Return response    │  │
    │  └───────────────────────┘  │
    └─────────────────────────────┘
              │
              ▼
         Controller maps to HTTP response
```

---

## Why Proxy Pattern?

### Without Proxy (Tight Coupling)
```typescript
// Controller directly calls external provider - BAD
class Controller {
  async generate(req) {
    const result = await openAIClient.createImage(req.prompt); // Tight coupling
    await db.save(result);  // Mixed concerns
    await cache.set(key, result);  // Mixed concerns
    return result;
  }
}
```

### With Proxy (Loose Coupling)
```typescript
// Controller only knows the interface - GOOD
class Controller {
  constructor(private service: IImageGenerationService) {}
  
  async generate(req) {
    return this.service.generateImage(req);  // Abstraction
  }
}
```

**Benefits:**
1. **Decoupling** - Controller doesn't know about caching, logging, or provider
2. **Testability** - Mock the interface for unit tests
3. **Flexibility** - Swap providers without changing controller
4. **Centralized concerns** - Caching, rate limiting in one place
5. **Protection** - Proxy protects system from expensive/unstable external calls

---

## Testing Strategy

### Unit Tests
- Mock `IImageGenerationService` for controller tests
- Mock `IImageMetadataRepository` and `IImageGenerationCache` for proxy tests
- Mock `ExternalAIImageClient` for real service tests

### Integration Tests
- Test full flow with in-memory implementations
- Verify caching behavior
- Verify metadata persistence

### Example Test Setup
```typescript
// Mock dependencies
const mockCache = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
const mockRepo = { save: jest.fn(), findById: jest.fn(), update: jest.fn() };
const mockRealService = { generateImage: jest.fn(), getGenerationStatus: jest.fn() };

// Inject mocks
const proxy = new ImageGenerationProxy(mockRealService, mockCache, mockRepo, null);
```

---

## Extension Points

| To Add | Where to Extend |
|--------|-----------------|
| New AI provider | Create new `ExternalAIImageClient` implementation |
| Database storage | Implement `IImageMetadataRepository` |
| Redis cache | Implement `IImageGenerationCache` |
| New validation rules | Add to `ImageGenerationProxy.validateRequest()` |
| Metrics/monitoring | Add to `Logger` or create `MetricsCollector` |
| Authentication | Add middleware before controller |
