# Step 1: Build Angular PWA
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --ignore-scripts

COPY . .
RUN npm run build -- --configuration production

# Step 2: Nginx server hosting the Angular build with TLS / HTTPS support
FROM nginx:alpine

RUN apk add --no-cache openssl libcap \
    && setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx \
    && sed -i 's/user  nginx;/# user nginx;/' /etc/nginx/nginx.conf \
    && sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|g' /etc/nginx/nginx.conf \
    && sed -i 's|/run/nginx.pid|/tmp/nginx.pid|g' /etc/nginx/nginx.conf \
    && rm -f /var/log/nginx/error.log /var/log/nginx/access.log \
    && mkdir -p /var/log/nginx \
    && touch /var/log/nginx/error.log /var/log/nginx/access.log \
    && mkdir -p \
        /var/cache/nginx/client_temp \
        /var/cache/nginx/proxy_temp \
        /var/cache/nginx/fastcgi_temp \
        /var/cache/nginx/uwsgi_temp \
        /var/cache/nginx/scgi_temp \
        /var/log/openbar/frontend \
        /tmp/certs \
    && chown -R nginx:nginx \
        /var/cache/nginx \
        /var/log/nginx \
        /var/log/openbar \
        /tmp \
        /usr/share/nginx/html \
        /etc/nginx

COPY --from=build /app/dist/gestion-cocktail-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh \
    && chmod +x /entrypoint.sh \
    && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx /entrypoint.sh

USER nginx

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]

