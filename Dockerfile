# syntax=docker/dockerfile:1.8
# check=error=true

# Build: docker build --tag buch:2026.10.1 .
# Laufzeit: key.pem unter /opt/app/dist/src/config/tls/key.pem einhaengen und CLIENT_SECRET setzen.
#           config.toml fuer Datenbank-Host und -Passwort bei Bedarf ebenfalls einhaengen.

ARG NODE_VERSION=26.13.0
ARG PNPM_VERSION=12.19.0

# ------------------------------------------------------------------------------
# Build
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-trixie-slim AS build

ARG PNPM_VERSION

WORKDIR /home/node/app

RUN npm install --global pnpm@${PNPM_VERSION}
RUN chown node:node /home/node/app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src

USER node

RUN pnpm install --frozen-lockfile \
  && pnpm run tsc \
  && mkdir -p dist/src/config/tls dist/src/config/postgresql \
  && cp src/config/config.toml dist/src/config/config.toml \
  && cp src/config/tls/certificate.crt dist/src/config/tls/certificate.crt \
  && cp src/config/postgresql/server.crt dist/src/config/postgresql/server.crt

# ------------------------------------------------------------------------------
# Production dependencies
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-trixie-slim AS dependencies

ARG PNPM_VERSION

WORKDIR /home/node/app

RUN npm install --global pnpm@${PNPM_VERSION}
RUN chown node:node /home/node/app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER node

RUN pnpm install --prod --frozen-lockfile

# ------------------------------------------------------------------------------
# Runtime
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-trixie-slim AS final

ENV NODE_ENV=production

WORKDIR /opt/app

RUN chown node:node /opt/app

COPY --from=build --chown=node:node /home/node/app/package.json ./package.json
COPY --from=build --chown=node:node /home/node/app/dist/src ./dist/src
COPY --from=dependencies --chown=node:node /home/node/app/node_modules ./node_modules

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["node", "-e", "require('node:https').get('https://localhost:3000/health/readiness', { rejectUnauthorized: false }, (response) => { response.resume(); process.exit(response.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]

ENTRYPOINT ["node", "dist/src/server.mjs"]
