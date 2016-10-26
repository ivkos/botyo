FROM    node:6.9

RUN     apt-get update && apt-get upgrade -y

RUN     groupadd -g 1001 node && useradd -m -u 1001 -g 1001 -N -s /bin/bash node
RUN     chown -R node:node /home/node