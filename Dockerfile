FROM node:20-alpine

# Install build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm install

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# Expose port
EXPOSE 8080

# Set production env
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["npx", "tsx", "server.ts"]
