# ---- Build stage ----
    FROM node:22-bookworm AS build
    WORKDIR /app
    
    COPY package*.json ./
    RUN npm ci
    
    COPY prisma ./prisma
    RUN npx prisma generate
    
    COPY . .
    RUN npm run build
    
    # ---- Runtime stage ----
    FROM node:22-bookworm AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=3000
    
    # Prod-Abhängigkeiten installieren (postinstall erzeugt Prisma Client)
    COPY package*.json ./
    COPY prisma ./prisma
    RUN npm ci --omit=dev
    
    # Build-Artefakte
    COPY --from=build /app/.next ./.next
    COPY --from=build /app/public ./public
    COPY --from=build /app/prisma ./prisma
    COPY --from=build /app/package*.json ./
    
    USER node
    EXPOSE 3000
    CMD sh -c "npx prisma migrate deploy || npx prisma db push; npm run start"