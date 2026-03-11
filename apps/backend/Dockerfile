FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps/backend apps/backend
COPY packages/shared-types packages/shared-types
RUN corepack pnpm install --frozen-lockfile=false
RUN corepack pnpm --filter @ab/shared-types build
RUN corepack pnpm --filter @ab/backend build

FROM node:22-alpine AS runtime
WORKDIR /app/apps/backend
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
