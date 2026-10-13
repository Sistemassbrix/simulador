FROM node:24.13.0-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
COPY apps ./apps
COPY tools/read-source.ts tools/import-data.ts tools/verify-data.ts ./tools/
RUN npm run build

FROM build AS api
ENV NODE_ENV=production PORT=3082
USER node
CMD ["node", "apps/api/dist/main.js"]

FROM nginx:1.29.4-alpine AS web
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY deployment/web.conf /etc/nginx/conf.d/default.conf
