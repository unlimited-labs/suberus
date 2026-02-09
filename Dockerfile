# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Run only necessary postinstall scripts (prisma engines, esbuild)
RUN pnpm rebuild @prisma/engines esbuild

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm exec prisma generate

ARG VITE_APP_URL=http://localhost:3001
ENV NODE_ENV=production

COPY . .
RUN pnpm build

# Prepare minimal prisma runtime for migrations
RUN mkdir /prisma-runtime && cd /prisma-runtime \
    && npm init -y \
    && npm install prisma dotenv --save-exact \
    && npm cache clean --force

# --- Migrate stage (used as init container) ---
FROM node:22-alpine AS migrate

WORKDIR /app

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /prisma-runtime/node_modules ./node_modules

CMD ["npx", "prisma", "migrate", "deploy"]

# --- Runtime stage ---
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/.output ./.output

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
