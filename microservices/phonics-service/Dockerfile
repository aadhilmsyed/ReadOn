FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SERVICE_NAME=phonics-service

EXPOSE 8080

COPY microservices/common ./microservices/common
COPY microservices/phonics-service/server.js ./microservices/phonics-service/server.js

WORKDIR /app/microservices/phonics-service

CMD ["node","server.js"]

