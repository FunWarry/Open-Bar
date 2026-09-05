# Étape 1 : Build Angular
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --ignore-scripts

COPY . .
RUN npm build --configuration production

# Étape 2 : Nginx pour servir le build Angular avec support TLS / HTTPS
FROM nginx:alpine

RUN apk add --no-cache openssl \
    && addgroup -S nonroot \
    && adduser -S nonroot -G nonroot \
    && mkdir -p /var/log/openbar/frontend /var/cache/nginx /var/run /var/log/nginx /etc/nginx/certs \
    && chown -R nonroot:nonroot \
        /var/log/openbar \
        /var/cache/nginx \
        /var/run \
        /var/log/nginx \
        /etc/nginx/certs \
        /usr/share/nginx/html \
        /etc/nginx/conf.d

COPY --from=build /app/dist/gestion-cocktail-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && chown -R nonroot:nonroot /usr/share/nginx/html /etc/nginx/conf.d/default.conf /entrypoint.sh /etc/nginx/certs

USER nonroot

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
