# ---- Build stage ----
    FROM node:22-alpine AS build
    WORKDIR /app
    
    # Install deps
    COPY package*.json ./
    RUN npm ci
    
    # Prisma client generate (keine DB-Verbindung nötig)
    COPY prisma ./prisma
    RUN npx prisma generate
    
    # Copy source und build
    COPY . .
    RUN npm run build
    
    # ---- Runtime stage ----
    FROM node:22-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=3000
    
    # node_modules und Build-Artefakte übernehmen
    COPY --from=build /app/node_modules ./node_modules
    COPY --from=build /app/.next ./.next
    COPY --from=build /app/public ./public
    COPY --from=build /app/prisma ./prisma
    COPY --from=build /app/package*.json ./
    
    EXPOSE 3000
    
    # Start: versucht Migrationen auszuführen, sonst Schema pushen, dann App starten
    CMD sh -c "npx prisma migrate deploy || npx prisma db push; npm run start"