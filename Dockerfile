# Multi-stage build for HanaNav frontend

# Stage 1: build assets
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package manifests first for better caching
COPY package*.json ./

# Install dependencies (include dev deps for build)
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine

# Install runtime dependencies (curl, envsubst) and create non-root user
RUN apk add --no-cache curl gettext \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

# Remove default config and copy assets/config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Ensure proper permissions for non-root nginx
RUN chown -R nextjs:nodejs /usr/share/nginx/html \
  && chown -R nextjs:nodejs /var/cache/nginx \
  && chown -R nextjs:nodejs /var/log/nginx \
  && chown -R nextjs:nodejs /etc/nginx/conf.d \
  && touch /var/run/nginx.pid \
  && chown nextjs:nodejs /var/run/nginx.pid

EXPOSE 80

USER nextjs

ENTRYPOINT ["/entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
