# Use Bun’s base image for runtime
FROM oven/bun:1.1.3 AS base

# Set working directory
WORKDIR /app

# Install Node.js to use npm (Bun image includes Node)
RUN apt-get update && apt-get install -y npm

# Copy package.json and package-lock.json for npm install
COPY package.json package-lock.json ./

# Install dependencies with npm, not Bun
RUN npm ci

# Copy the rest of the source code
COPY . .

# Use Bun to run the bot (it can run .ts files natively)
CMD ["bun", "run", "src/index.ts"]
