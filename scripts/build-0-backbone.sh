#!/usr/bin/env bash

set -e

cd `dirname $0`

docker build -t ivkos/facebook-group-chat-bot-backbone -f 0-backbone.dockerfile ./