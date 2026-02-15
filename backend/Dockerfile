# ---- Build stage ----
FROM oven/bun:1 AS build

WORKDIR /app

# Install dependencies first (cache-friendly layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN bunx prisma generate

# Copy the rest of the source code
COPY . .

# ---- Production stage ----
FROM oven/bun:1-slim AS production

WORKDIR /app

# Copy node_modules, generated prisma client, and source code from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

# The pre-built frontend files should be in backend/public/ before building the image.
# Copy them into the container.
COPY public ./public

EXPOSE 3333

CMD ["bun", "run", "src/app.ts"]
