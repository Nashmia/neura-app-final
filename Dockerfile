# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

ARG NODE_VERSION=24.14.0-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

# Copy package files and lock file
COPY package.json package-lock.json* ./

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# ============================================
# Stage 2: Build Stage
# ============================================

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# ============================================
# Stage 3: Runtime Stage
# ============================================

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy public files
COPY --from=builder /app/public ./public

# Copy built Next.js application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json .

# Create non-root user for security
RUN useradd -m -u 1001 nextuser && chown -R nextuser:nextuser /app

USER nextuser

# Expose port 3000
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
