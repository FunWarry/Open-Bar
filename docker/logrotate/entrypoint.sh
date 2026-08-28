#!/bin/sh
set -e

echo "=== OpenBar Centralized Logging & Rotation Service ==="
echo "Ensuring log directories exist..."
mkdir -p /var/log/openbar/backend /var/log/openbar/frontend /var/log/openbar/postgres
chmod -R 0775 /var/log/openbar

echo "Running initial logrotate pass..."
/usr/sbin/logrotate /etc/logrotate.d/openbar || true

echo "Configuring periodic logrotate cron job (every hour)..."
echo "0 * * * * /usr/sbin/logrotate /etc/logrotate.d/openbar > /proc/1/fd/1 2>&1" > /etc/crontabs/root

echo "Starting crond background service..."
exec crond -f -l 2
