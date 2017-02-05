FROM    ivkos/botyo-backbone

ADD     package.json /app/

WORKDIR /app
RUN     yarn install
