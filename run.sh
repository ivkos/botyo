#!/usr/bin/env bash

set -e

./scripts/build-2-app.sh

mkdir -p ./data/bot
mkdir -p ./data/mongo

printf "\033c" # clear the screen
docker-compose up -d

printf "\033c"
docker-compose logs -f