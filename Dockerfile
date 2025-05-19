    FROM node:20-slim AS builder

    WORKDIR /app
    
    RUN apt-get update \
     && apt-get install -y ffmpeg build-essential python3
    
    COPY package.json package-lock.json ./
    RUN npm ci
    
    COPY . .
    RUN npm run build          
    
    FROM node:20-slim
    
    WORKDIR /app
    
    COPY --from=builder /app/node_modules ./node_modules
    
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/public ./public       
    
    RUN apt-get update && apt-get install -y ffmpeg && \
        rm -rf /var/lib/apt/lists/*
    
    CMD ["node", "dist/index.js"]
    