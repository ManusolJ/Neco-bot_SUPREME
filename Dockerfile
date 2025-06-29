FROM node:20-slim AS builder

ENV TZ=UTC

WORKDIR /app

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ffmpeg \
    libpq5 \
    tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
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