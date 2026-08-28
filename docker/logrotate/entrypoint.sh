#!/bin/sh
set -e

echo "=== OpenBar Centralized Logging & Rotation Service ==="

# Periodic logrotate loop every 3600 seconds (1 hour)
while true; do
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Running logrotate..."
    /usr/sbin/logrotate -s /tmp/logrotate.status /etc/logrotate.d/openbar || true
    sleep 3600 &
    wait $!
done
