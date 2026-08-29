# Node 22 LTS — the project requires Node >= 22 (AWS SDK v3 + nsfwjs + sharp prebuilds)
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including devDeps like typescript needed at build time).
# The @types/* and typescript are build-time only, so we prune them for the final image.
RUN npm ci && npm cache clean --force

COPY . .

# Compile TypeScript to dist/ (always — both dev and prod need it, but prod runs node dist)
RUN npm run build

# Prune devDependencies so the runtime image only ships what 'npm start' needs
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 3000

# Production runtime: node dist/index.js (compiled, no ts-node needed)
ENV NODE_ENV=production
CMD ["npm", "start"]
