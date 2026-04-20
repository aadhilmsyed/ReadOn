# Build from repository root (see ops/gcp/build-image.sh).
FROM node:22-alpine

WORKDIR /app/microservices/phonics-service

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=phonics-service

COPY microservices/phonics-service/package.json microservices/phonics-service/package-lock.json ./
RUN npm ci --omit=dev

COPY microservices/phonics-service/ ./

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
