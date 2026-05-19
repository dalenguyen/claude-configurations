# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build <name> --configuration=production

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist/apps/<name> ./

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "analog/server/index.mjs"]
