# ---- Build stage ----
FROM node:22-bookworm AS build
WORKDIR /app

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

# Install deps; avoid scripts (Prisma) during build; on failure dump logs and try fallback
RUN npm ci --no-audit --no-fund --ignore-scripts --verbose \
 || (echo 'npm ci failed, trying npm install (ignore-scripts) ...' \
     && npm install --no-audit --no-fund --ignore-scripts --verbose) \
 || (echo 'Dumping npm logs...' \
     && (test -d /root/.npm/_logs && find /root/.npm/_logs -type f -name '*.log' -print -exec cat {} \; || true) \
     && exit 1)

COPY prisma ./prisma
# Prisma generate will run at runtime to avoid build-time network flakiness
# RUN npx prisma generate

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

USER node
EXPOSE 3000
CMD sh -c "npx prisma generate && (npx prisma migrate deploy || npx prisma db push); npm run start"