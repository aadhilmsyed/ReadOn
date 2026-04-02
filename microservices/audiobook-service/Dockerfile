FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=audiobook-service

EXPOSE 8080

COPY microservices/common ./microservices/common
COPY microservices/audiobook-service/server.js ./microservices/audiobook-service/server.js

WORKDIR /app/microservices/audiobook-service

CMD ["node","server.js"]

