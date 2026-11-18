# Multi-stage production-ready Dockerfile for KILN & CLAY
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies with cached layer
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY server.js ./
COPY index.html ./

# Expose container port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security best practices
USER node

# Start web server
CMD ["node", "server.js"]
