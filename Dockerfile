# ---- Build stage ----
FROM node:22-bookworm AS build
WORKDIR /app

# System build deps for native modules (e.g. sharp)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Optional Proxy (no effect if not provided)
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY}

COPY package*.json ./

# Show versions
RUN node -v && npm -v

# Harden npm config and print it
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-maxtimeout 600000 \
 && npm config set fetch-timeout 600000 \
 && npm config set fund false \
 && npm config set audit false \
 && npm config set registry https://registry.npmjs.org/ \
 && npm config set prefer-online true \
 && echo "=== npm config list ===" \
 && npm config list

# Verify registry reachability during build
RUN npm ping --registry=https://registry.npmjs.org || true

# Install deps deterministically; avoid scripts (Prisma) during build; allow legacy peer deps to prevent resolver failures in CI
RUN npm ci --no-audit --no-fund --ignore-scripts --verbose --legacy-peer-deps \
 || (echo 'Dumping npm logs...' \
     && (test -d /root/.npm/_logs && find /root/.npm/_logs -type f -name '*.log' -print -exec cat {} \; || true) \
     && exit 1)

# Ensure native modules like sharp are properly built (postinstall scripts were skipped above)
RUN npm rebuild sharp --verbose || true
COPY prisma ./prisma
## Generate Prisma client during build so TS types are available for `next build`
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Production node_modules + Build-Artefakte übernehmen
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
COPY --from=build /app/deploy/entrypoint.sh ./entrypoint.sh

# Ensure entrypoint is executable and create writable uploads directory before switching to non-root user
RUN chmod +x ./entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["./entrypoint.sh"]