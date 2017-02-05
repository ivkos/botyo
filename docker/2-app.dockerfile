FROM    ivkos/botyo-node-deps

ADD     . /app

RUN     mkdir -p /data/app
VOLUME  /data/app

WORKDIR /app

RUN     yarn run build

CMD     ["node", "build/index.js"]