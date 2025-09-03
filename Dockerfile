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
# Diagnostics + hardened install to surface errors
RUN node -v && npm -v \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-maxtimeout 600000 \
 && npm config set fund false \
 && npm config set audit false \
 && npm config set registry https://registry.npmjs.org/ \
 && echo "=== npm config list ===" \
 && npm config list \
 && npm ci --no-audit --no-fund --loglevel=verbose

COPY prisma ./prisma
# Prisma Generate wird zur Runtime ausgeführt, um Build-Zeit-Netzwerkabhängigkeiten zu vermeiden
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