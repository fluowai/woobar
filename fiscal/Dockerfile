FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json ./
RUN composer install --no-dev --no-interaction --optimize-autoloader --no-scripts
COPY public ./public
COPY src ./src
RUN composer dump-autoload --optimize --no-dev

FROM php:8.3-cli-bookworm
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/bin/
RUN install-php-extensions curl dom gd mbstring soap xml zip sockets opcache

WORKDIR /app
COPY --from=vendor /app/vendor ./vendor
COPY --from=vendor /app/public ./public
COPY --from=vendor /app/src ./src

ENV FISCAL_STORAGE=/app/storage
RUN mkdir -p /app/storage && chown -R www-data:www-data /app/storage

EXPOSE 8080
ENV PHP_CLI_SERVER_WORKERS=4
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
