# Multi-stage build for FarePlay Casino Backend

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npm run db:generate

# Build all packages and apps
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/apps/*/dist ./apps/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema for migrations
COPY packages/db/prisma ./packages/db/prisma

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose ports
EXPOSE 3000 3001

# Default command (can be overridden)
CMD ["node", "apps/api/dist/index.js"]


