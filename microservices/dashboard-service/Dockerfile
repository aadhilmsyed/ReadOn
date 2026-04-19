FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=dashboard-service

EXPOSE 8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY microservices/dashboard-service ./microservices/dashboard-service

WORKDIR /app/microservices/dashboard-service

CMD ["node","server.js"]
