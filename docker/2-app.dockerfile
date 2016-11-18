FROM    ivkos/botyo-node-deps

ADD     . /app

RUN     mkdir -p /data/app
VOLUME  /data/app

COPY        ./docker/docker-entrypoint.sh /entrypoint.sh
RUN         chmod +x /entrypoint.sh
ENTRYPOINT  ["/entrypoint.sh"]

WORKDIR /app

CMD     ["npm", "run", "start"]