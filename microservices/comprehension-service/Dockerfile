FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=comprehension-service

EXPOSE 8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY microservices/common ./microservices/common
COPY microservices/comprehension-service ./microservices/comprehension-service

WORKDIR /app/microservices/comprehension-service

CMD ["node","server.js"]
