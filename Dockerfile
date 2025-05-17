# --- Builder stage ---
    FROM node:20-alpine AS builder

    RUN apk add --no-cache ffmpeg python3 make g++
    
    WORKDIR /app
    
    COPY package*.json ./
    RUN npm ci
    
    COPY . .
    
    RUN npm run build \
     && cp -r src/events dist/events \
     && cp -r src/commands dist/commands
    
    FROM node:20-alpine
    
    RUN apk add --no-cache ffmpeg opus libsodium
    
    WORKDIR /app
    
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/package*.json ./
    RUN npm ci --omit=dev
    
    CMD ["npm", "start"]
    