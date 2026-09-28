FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

# Deterministic install from package-lock.json.
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run typecheck
RUN npm test
RUN npm run build

# Convert the already-installed dependency tree to production-only.
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/agents ./agents
COPY --from=builder /app/company-os ./company-os

EXPOSE 4317

CMD ["npm", "start"]
