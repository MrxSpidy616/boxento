FROM node:20-slim

# Install build dependencies for better-sqlite3 and curl for healthcheck
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - use npm ci for cleaner install
# and rebuild native modules for this platform
RUN npm install --build-from-source

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/boxento.db

EXPOSE 3001

CMD ["npm", "start"]
