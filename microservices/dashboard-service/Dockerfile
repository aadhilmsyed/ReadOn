# Build from repository root (see ops/gcp/build-image.sh).
FROM node:22-alpine

WORKDIR /app/microservices/dashboard-service

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=dashboard-service

COPY microservices/dashboard-service/package.json microservices/dashboard-service/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY microservices/dashboard-service/ ./

EXPOSE 8080

CMD ["node", "server.js"]
