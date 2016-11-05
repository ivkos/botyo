#!/usr/bin/env bash

set -e

CONTAINER_ID=$(docker ps | grep ivkos/facebook-group-chat-bot-app | cut -f1 -d" ")

docker stop ${CONTAINER_ID}
