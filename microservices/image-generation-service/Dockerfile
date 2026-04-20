# Build from repository root (see ops/gcp/build-image.sh).
FROM node:22-alpine AS builder
WORKDIR /app
COPY microservices/image-generation-service/package.json microservices/image-generation-service/package-lock.json ./
RUN npm ci
COPY microservices/image-generation-service/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY microservices/image-generation-service/package.json microservices/image-generation-service/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/server.js"]
