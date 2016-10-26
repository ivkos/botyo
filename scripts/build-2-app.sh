#!/usr/bin/env bash

set -e

cd `dirname $0`

if !(docker images | grep ivkos/facebook-group-chat-bot-node-deps)
then
    ./build-1-node-deps.sh
fi

docker build -t ivkos/facebook-group-chat-bot-app -f 2-app.dockerfile ../