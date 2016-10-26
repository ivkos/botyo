#!/usr/bin/env bash

set -e

cd `dirname $0`

if !(docker images | grep ivkos/facebook-group-chat-bot-backbone)
then
    ./build-0-backbone.sh
fi

docker build -t ivkos/facebook-group-chat-bot-node-deps -f 1-node-deps.dockerfile ../