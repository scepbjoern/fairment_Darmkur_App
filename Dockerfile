# ---- Build stage ----
    FROM node:22-bookworm-slim AS build
    WORKDIR /app
    
    # OS Pakete updaten + benötigte Pakete installieren
    ARG DEBIAN_FRONTEND=noninteractive
    RUN apt-get update \
     && apt-get -y upgrade \
     && apt-get install -y --no-install-recommends openssl ca-certificates \
     && rm -rf /var/lib/apt/lists/*
    
    COPY package*.json ./
    RUN npm ci
    
    COPY prisma ./prisma
    RUN npx prisma generate
    
    COPY . .
    RUN npm run build
    
    # ---- Runtime stage ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get -y upgrade \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Nur Prod-Abhängigkeiten installieren (Postinstall generiert Prisma Client)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# Build-Artefakte übernehmen
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

USER node
EXPOSE 3000
CMD sh -c "npx prisma migrate deploy || npx prisma db push; npm run start"