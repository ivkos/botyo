FROM    node:4.6

RUN     npm install -g -q --progress=false yarn

#RUN    groupadd -g 1001 node && useradd -m -u 1001 -g 1001 -N -s /bin/bash node
RUN     mkdir -p /home/node

RUN     chown -R node:node /home/node