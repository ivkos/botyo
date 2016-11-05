FROM    ivkos/facebook-group-chat-bot-node-deps

ADD     . /home/node/facebook-group-chat-bot
RUN     chown -R node:node /home/node/facebook-group-chat-bot

USER    node
ENV     HOME /home/node

# Build and start
WORKDIR /home/node/facebook-group-chat-bot

CMD     ["yarn", "run", "start"]