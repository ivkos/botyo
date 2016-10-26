#!/usr/bin/env bash

set -e

./scripts/build-1-node-deps.sh
./scripts/build-2-app.sh

printf "\033c" # clear the screen
CONTAINER_ID=$(docker run -d ivkos/facebook-group-chat-bot-app)

printf "\033c"
docker logs -t -f ${CONTAINER_ID}
