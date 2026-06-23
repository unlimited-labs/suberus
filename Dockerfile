FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Run only necessary postinstall scripts (prisma engines, esbuild)
RUN pnpm rebuild @prisma/engines esbuild

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm exec prisma generate

ENV NODE_ENV=production

COPY . .
RUN pnpm build

RUN mkdir /prisma-runtime && cd /prisma-runtime \
    && npm init -y \
    && npm install prisma dotenv --save-exact \
    && npm cache clean --force

FROM node:22-alpine AS migrate

WORKDIR /app

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /prisma-runtime/node_modules ./node_modules

CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine

# Build metadata (passed via docker-bake args); exposed at runtime via /api/version
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_DATE=$BUILD_DATE

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY --from=build --chown=appuser:appgroup /app/.output ./.output
COPY --chown=appuser:appgroup --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER appuser

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
