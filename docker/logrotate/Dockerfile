FROM alpine:3.19

RUN apk add --no-cache bash logrotate tzdata \
    && addgroup -g 1001 -S logrotate \
    && adduser -u 1001 -S logrotate -G logrotate

COPY logrotate.conf /etc/logrotate.conf
COPY openbar.logrotate /etc/logrotate.d/openbar
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && chmod 0644 /etc/logrotate.conf /etc/logrotate.d/openbar \
    && chown -R logrotate:logrotate /etc/logrotate.conf /etc/logrotate.d /entrypoint.sh

USER logrotate:logrotate

ENTRYPOINT ["/entrypoint.sh"]

