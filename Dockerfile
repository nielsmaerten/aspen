FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Enable Corepack so we get the pinned pnpm version.
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json vitest.config.ts ./
COPY src ./src
COPY prompt-templates ./prompt-templates
RUN pnpm build

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prompt-templates ./prompt-templates
COPY package.json pnpm-lock.yaml ./

ENTRYPOINT ["node", "dist/index.js"]
