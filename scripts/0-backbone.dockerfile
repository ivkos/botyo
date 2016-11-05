FROM    node:4.6

RUN     npm install -g -q --progress=false yarn

RUN     mkdir -p /app
