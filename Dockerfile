FROM ubuntu:24.04

# Set noninteractive mode to avoid tzdata prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js, npm, and yt-dlp
RUN apt-get update && \
    apt-get install -y curl python3 yt-dlp && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything else
COPY . .

# Build TypeScript project
RUN npm run build

# Expose app port (optional — 3000 is common)
EXPOSE 4321

# Start the app
CMD ["node", "./dist/index.js"]
