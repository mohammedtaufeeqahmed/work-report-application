# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Increase Node.js memory limit for build (2GB - adjusted for smaller EC2 instances)
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies (production only for smaller image)
RUN npm ci --only=production=false && npm cache clean --force

# Copy source code
COPY . .

# Build the application with increased memory
# Use standalone output to reduce build size
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder (much smaller than full node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for SQLite database
RUN mkdir -p ./data && chown -R nextjs:nodejs ./data

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use the standalone server.js instead of npm start
CMD ["node", "server.js"]
