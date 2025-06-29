FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y build-essential python3 libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y ffmpeg libpq5 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public 

CMD ["node", "dist/index.js"]