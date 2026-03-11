FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps/admin apps/admin
RUN corepack pnpm install --frozen-lockfile=false --prod=false
RUN corepack pnpm --filter @ab/admin build

FROM nginx:alpine
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
