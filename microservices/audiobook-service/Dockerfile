# Build from repository root (see ops/gcp/build-image.sh).
FROM node:22-alpine

WORKDIR /app/microservices/audiobook-service

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=audiobook-service

COPY microservices/audiobook-service/package.json microservices/audiobook-service/package-lock.json ./
RUN npm ci --omit=dev

COPY microservices/audiobook-service/ ./

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
