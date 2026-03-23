FROM node:20.19.6-alpine
# Allow corepack to download without interactive prompt
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apk upgrade --no-cache && \
    corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

# Pre-populate the pnpm store from lockfile (if available).
# This layer is cached until pnpm-lock.yaml changes.
# The store lives at /pnpm/store (NOT under /app), so it survives
# bind-mounts and named volumes. At runtime, `pnpm install` finds
# packages here instead of downloading from the network.
COPY pnpm-lock.yaml ./
RUN pnpm fetch --store-dir /pnpm/store

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
