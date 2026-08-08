# Multi-stage: типы из OpenAPI и сборка в node, раздача в nginx.
# Контекст сборки — корень репозитория: фронтенд собирается вместе с контрактом
# api/openapi.yaml (MNT4).

FROM node:22-alpine AS build
WORKDIR /workspace

COPY api/openapi.yaml api/openapi.yaml
COPY frontend/package.json frontend/package-lock.json frontend/

WORKDIR /workspace/frontend
RUN npm ci
RUN npm run api-types

# Источник COPY — относительно корня контекста, назначение — относительно WORKDIR.
COPY frontend/index.html ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.app.json ./
COPY frontend/tsconfig.node.json ./
COPY frontend/vite.config.ts ./
COPY frontend/eslint.config.js ./
COPY frontend/.prettierrc.json ./
COPY frontend/src ./src

RUN npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/dist /usr/share/nginx/html
EXPOSE 80
