# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Production stage
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appuser && adduser -S -G appuser appuser

# Set NODE_ENV
ENV NODE_ENV production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Use non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]