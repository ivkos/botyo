FROM    ivkos/facebook-group-chat-bot-node-deps

ADD     . /app

RUN     mkdir -p /data/app
VOLUME  /data/app

WORKDIR /app

CMD     ["yarn", "run", "start"]