FROM node:20-alpine

WORKDIR /app

# Copy backend package files first (Docker layer caching)
COPY package*.json ./

# Install all deps
RUN npm ci && npm cache clean --force

# Copy backend source
COPY . .

# Build TypeScript
RUN npm run build

# Copy SQL migration files to dist/ (TypeScript only compiles .ts → .js)
RUN mkdir -p dist/database/migrations && \
    cp src/database/migrations/*.sql dist/database/migrations/

EXPOSE 3000

CMD ["npm", "start"]
