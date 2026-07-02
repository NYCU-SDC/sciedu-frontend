FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
ARG VITE_BUILD_MODE
ARG VITE_BACKEND_BASE_URL
ARG VITE_APP_MODE
ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG VITE_PUBLIC_POSTHOG_HOST

RUN echo "Building with mode=${VITE_BUILD_MODE:-production}" && \
    VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL} \
    VITE_APP_MODE=${VITE_APP_MODE} \
    VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=${VITE_PUBLIC_POSTHOG_PROJECT_TOKEN} \
    VITE_PUBLIC_POSTHOG_HOST=${VITE_PUBLIC_POSTHOG_HOST} \
    npx vite build --mode=${VITE_BUILD_MODE:-production}

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
