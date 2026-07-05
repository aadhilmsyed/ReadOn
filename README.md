# Read On

Read On is a reading support platform with four learner-facing capabilities:

- phonics and pronunciation support
- reading comprehension activities
- story visualization
- audiobook/read-aloud playback

The app uses a story-centric flow: generate a story once, then access all features by `storyId` from `/features/[storyId]`.

## Repository Structure

```text
ReadOn/
├── src/app/             # Next.js routes and API handlers
├── views/               # UI components and page views
├── orchestrators/       # BFF/service composition layer
├── microservices/       # phonics, comprehension, image-generation, audiobook, dashboard
├── shared/              # shared clients, types, constants
├── ops/gcp/             # deploy/provision/verify scripts
└── docs/                # architecture and operations docs
```

## Core Architecture

- **Frontend:** Next.js + Chakra UI
- **Backend-for-Frontend:** orchestrators in the Next app
- **Services:** independent microservices for each feature area
- **Data ownership:** story and feature data are loaded by `storyId`, with route-level ownership checks in BFF APIs

## Running the App (local dev)

The Next app and microservices run as separate processes.

1. Install dependencies:

```bash
npm install
npm --prefix microservices/phonics-service install
npm --prefix microservices/comprehension-service install
npm --prefix microservices/image-generation-service install
npm --prefix microservices/audiobook-service install
npm --prefix microservices/dashboard-service install
```

2. Copy env templates and configure values:

```bash
cp .env.example .env
cp microservices/phonics-service/.env.example microservices/phonics-service/.env
cp microservices/comprehension-service/.env.example microservices/comprehension-service/.env
cp microservices/image-generation-service/.env.example microservices/image-generation-service/.env
cp microservices/audiobook-service/.env.example microservices/audiobook-service/.env
cp microservices/dashboard-service/.env.example microservices/dashboard-service/.env
```

3. Start services:

```bash
npm run dev:all
```

Or start individually with `npm run dev`, `npm run dev:phonics`, `npm run dev:comprehension`, `npm run dev:image-generation`, `npm run dev:audiobook`, and `npm run dev:dashboard`.

### Local Ports

| Process | Port |
| --- | --- |
| Main Next.js app | 3000 |
| phonics-service | 3001 |
| comprehension-service | 3002 |
| image-generation-service | 3003 |
| audiobook-service | 3004 |
| dashboard-service | 3005 |

## Main Routes

- `/` (story input + generate)
- `/dashboard`
- `/features/[storyId]` (feature hub)
- `/phonics`, `/comprehension`, `/visualization`, `/audiobook` (feature entry pages)
- `/audiobook/player`
- `/story/[id]`
- `/auth`

## Validation Commands

```bash
npm run lint
npm run test
npm run verify:services
npm run verify:endpoints
```

## Deployment (Google Cloud Run)

Deployment is script-driven from `ops/gcp/` (no built-in auto-deploy workflow in this repo).

- Provision: `bash ops/gcp/provision.sh`
- Deploy stack: `READON_DEPLOY_ENV=prod|test SERVICE_VERSION=<git-sha> bash ops/gcp/deploy-stack.sh`
- Verify: `READON_DEPLOY_ENV=prod|test bash ops/gcp/verify/verify-health.sh`

## Documentation

- Architecture: [docs/architecture.md](docs/architecture.md)
- Deployment guide: [docs/deployment-guide.md](docs/deployment-guide.md)
- CI/CD overview: [docs/cicd-overview.md](docs/cicd-overview.md)
- Env reference: [docs/environment-variables.md](docs/environment-variables.md)
