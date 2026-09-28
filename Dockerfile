FROM node:24-alpine AS prisma-cli

WORKDIR /prisma-runtime

COPY package.json /tmp/package.json
RUN npm init -y >/dev/null \
    && npm install --save-exact \
        "prisma@$(node -p "require('/tmp/package.json').devDependencies.prisma")" \
        "dotenv@$(node -p "require('/tmp/package.json').dependencies.dotenv")" \
    && npm cache clean --force

FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm exec prisma generate

ENV NODE_ENV=production

COPY . .
RUN pnpm build

FROM node:24-alpine AS migrate

WORKDIR /app

COPY --from=prisma-cli /prisma-runtime/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma

USER node

CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM node:24-alpine

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY --from=build --chown=appuser:appgroup /app/.output ./.output
COPY --chown=appuser:appgroup --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Build metadata (passed via docker-bake args); exposed at runtime via /api/version
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
ENV GIT_COMMIT=$GIT_COMMIT \
    BUILD_DATE=$BUILD_DATE \
    PORT=3001

USER appuser

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
