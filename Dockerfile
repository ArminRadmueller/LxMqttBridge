# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:26-trixie-slim AS build

WORKDIR /opt/bridge

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript and leave only production dependencies
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime stage ----
FROM node:26-trixie-slim

LABEL maintainer="Armin Radmüller"

ENV NODE_ENV=production

WORKDIR /opt/bridge

COPY --from=build /opt/bridge/build ./build
COPY --from=build /opt/bridge/node_modules ./node_modules
COPY --from=build /opt/bridge/package.json ./

# The config file is not part of the image - mount it at runtime:
#   docker run -v $(pwd)/config.json:/opt/bridge/config.json ...
# Environment variables (MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD, LOXONE_HOST,
# LOXONE_PORT, LOG_LEVEL, ...) can override the mounted config.

USER node

CMD [ "node", "build/bridge.js", "/opt/bridge/config.json" ]
