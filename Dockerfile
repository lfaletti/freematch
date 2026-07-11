FROM node:20-alpine

WORKDIR /app

# Copy backend package files first (Docker layer caching)
COPY backend/package*.json ./

# Install all deps
RUN npm ci && npm cache clean --force

# Copy backend source
COPY backend/ ./

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
