# --- Build stage -------------------------------------------------------------
    FROM node:20-slim AS builder

    WORKDIR /app
    
    # Install build-time system packages
    RUN apt-get update \
     && apt-get install -y ffmpeg build-essential python3
    
    # Install app dependencies
    COPY package.json package-lock.json ./
    RUN npm ci
    
    # Copy source and compile
    COPY . .
    RUN npm run build          # tsc  +  tsc-alias
    
    # --- Runtime stage -----------------------------------------------------------
    FROM node:20-slim
    
    WORKDIR /app
    
    # Copy node_modules (with native opus bindings compiled in the builder)
    COPY --from=builder /app/node_modules ./node_modules
    
    # Copy compiled JS only
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/public ./public       
    
    # FFmpeg runtime dependency
    RUN apt-get update && apt-get install -y ffmpeg && \
        rm -rf /var/lib/apt/lists/*
    
    ENV NODE_ENV=production
    CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]
    