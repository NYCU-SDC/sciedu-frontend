FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
ARG VITE_BUILD_MODE=development
ARG VITE_BACKEND_BASE_URL=""
ARG VITE_USE_CHAT_MOCK=false
RUN echo "Building with mode=${VITE_BUILD_MODE}" && \
    VITE_BACKEND_BASE_URL="$VITE_BACKEND_BASE_URL" \
    VITE_USE_CHAT_MOCK="$VITE_USE_CHAT_MOCK" \
    npx vite build --mode="$VITE_BUILD_MODE"

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
