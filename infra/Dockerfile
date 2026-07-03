FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src/db/migrations ./backend/src/db/migrations

EXPOSE 3100
CMD ["node", "backend/dist/backend/src/server.js"]
