# Build from repository root (see ops/gcp/build-image.sh).
FROM node:22-alpine

WORKDIR /app/microservices/comprehension-service

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=comprehension-service

COPY microservices/comprehension-service/package.json microservices/comprehension-service/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY microservices/common ../common
COPY microservices/comprehension-service/ ./

EXPOSE 8080

CMD ["node", "server.js"]
