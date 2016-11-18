#!/usr/bin/env bash

set -e

cd `dirname $0`

./build-1-node-deps.sh

docker build -t ivkos/facebook-group-chat-bot-app -f 2-app.dockerfile ../