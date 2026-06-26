FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies based on NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm ci --only=production && npm cache clean --force; \
    else \
      npm ci && npm cache clean --force; \
    fi

COPY . .

# Build only in production
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm run build; \
    fi

EXPOSE 3000

# Use dev script for development, start for production
CMD if [ "$NODE_ENV" = "production" ]; then \
      npm start; \
    else \
      npm run dev; \
    fi
