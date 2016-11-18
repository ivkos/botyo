FROM    ivkos/botyo-backbone

ADD     package.json /app/

WORKDIR /app
RUN     npm install
