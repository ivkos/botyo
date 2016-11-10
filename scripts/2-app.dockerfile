FROM    ivkos/facebook-group-chat-bot-node-deps

ADD     . /app

RUN     mkdir -p /data/app
VOLUME  /data/app

COPY        ./scripts/docker-entrypoint.sh /entrypoint.sh
RUN         chmod +x /entrypoint.sh
ENTRYPOINT  ["/entrypoint.sh"]

WORKDIR /app

CMD     ["npm", "run", "start"]