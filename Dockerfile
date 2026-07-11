FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install deps
RUN npm ci && npm cache clean --force

# Copy backend source
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Copy SQL migration files to dist/
RUN mkdir -p dist/database/migrations && \
    cp src/database/migrations/*.sql dist/database/migrations/

# ── Runtime ──
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
