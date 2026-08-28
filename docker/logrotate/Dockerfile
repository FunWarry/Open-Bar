FROM alpine:3.19

RUN apk add --no-cache bash logrotate tzdata

COPY logrotate.conf /etc/logrotate.conf
COPY openbar.logrotate /etc/logrotate.d/openbar
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && chmod 0644 /etc/logrotate.conf /etc/logrotate.d/openbar

ENTRYPOINT ["/entrypoint.sh"]
