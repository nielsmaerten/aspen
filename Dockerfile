# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY vitest.config.ts ./
COPY src ./src
COPY prompts ./prompts
RUN pnpm run build
RUN pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prompts ./prompts
COPY --from=build /app/prompts ./prompts-default
RUN mkdir -p /app/prompts /app/logs
CMD ["node", "dist/index.js"]
