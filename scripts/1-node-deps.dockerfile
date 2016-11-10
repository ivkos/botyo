FROM    ivkos/facebook-group-chat-bot-backbone

ADD     package.json /app/

WORKDIR /app
RUN     yarn install --ignore-engines
