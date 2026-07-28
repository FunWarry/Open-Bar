# Étape 1 : Build Angular
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --ignore-scripts

COPY . .
RUN npm build --configuration production

# Étape 2 : Nginx pour servir le build Angular
FROM nginx:alpine

RUN addgroup -S nonroot \
    && adduser -S nonroot -G nonroot

USER nonroot

COPY --from=build /app/dist/gestion-cocktail-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
