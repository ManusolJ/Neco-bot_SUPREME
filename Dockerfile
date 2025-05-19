# Use Bun’s base image for runtime
FROM oven/bun:1.1.3 AS base

# Set working directory
WORKDIR /app

# Install required system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json for npm install
COPY package.json package-lock.json ./

# Install dependencies with npm
RUN npm ci

# Copy the rest of the source code
COPY . .

# Use Bun to run the bot
CMD ["bun", "run", "src/index.ts"]
