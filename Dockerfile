# Single-stage build for development
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install minimal dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Build the application
RUN npm run build

# Expose application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]