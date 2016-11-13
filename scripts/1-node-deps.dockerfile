FROM    ivkos/facebook-group-chat-bot-backbone

ADD     package.json /app/

WORKDIR /app
RUN     npm install
