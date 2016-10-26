FROM    ivkos/facebook-group-chat-bot-backbone

ADD     package.json /home/node/facebook-group-chat-bot/

WORKDIR /home/node/facebook-group-chat-bot
RUN     npm install