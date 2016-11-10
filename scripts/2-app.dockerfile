FROM    ivkos/facebook-group-chat-bot-node-deps

ADD     . /app

WORKDIR /app
CMD     ["npm", "run", "start"]
