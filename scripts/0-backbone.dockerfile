FROM    node:6

RUN     npm install -g -q --progress=false yarn

RUN     mkdir -p /app /data/app
VOLUME  /data/app

COPY        ./scripts/docker-entrypoint.sh /entrypoint.sh
RUN         chmod +x /entrypoint.sh
ENTRYPOINT  ["/entrypoint.sh"]
