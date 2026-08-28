# Logrotate daemon container
# Runs as root user intentionally to manage and compress log files across
# multiple containers (postgres, spring backend, nginx frontend) with varying ownership.
FROM alpine:3.19

RUN apk add --no-cache bash logrotate tzdata

COPY logrotate.conf /etc/logrotate.conf
COPY openbar.logrotate /etc/logrotate.d/openbar
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && chmod 0644 /etc/logrotate.conf /etc/logrotate.d/openbar

# Root privilege is required by crond and logrotate to manipulate logs across UIDs
USER root

ENTRYPOINT ["/entrypoint.sh"]

