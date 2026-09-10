# syntax=docker/dockerfile:1
#
# VESPER — production image.
#
#   docker build -t vesper .
#   docker run -d -p 3300:3300 -v vesper-data:/data \
#     -e VESPER_SECRET="$(openssl rand -hex 32)" vesper
#
# /data holds the SQLite database, uploads and transcoded HLS. Use a named
# volume (a bind mount needs chown 1000:1000 first — the app runs as `node`).

# ------------------------------- dependencies -------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------- build -----------------------------------
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# fonts are loaded at runtime, so this build never needs the network
RUN npm run build

# --------------------------------- runtime ----------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    VESPER_DATA_DIR=/data \
    VESPER_SEED=0

# ffmpeg drives the transcoder; curl backs the healthcheck
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY next.config.mjs ./

RUN mkdir -p /data && chown -R node:node /data /app
VOLUME ["/data"]
USER node
EXPOSE 3300

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3300/api/health || exit 1

CMD ["npm", "start"]
