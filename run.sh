#!/usr/bin/env bash

set -e

./docker/build-2-app.sh

mkdir -p ./data/app
mkdir -p ./data/db

printf "\033c" # clear the screen
docker-compose up -d

printf "\033c"
docker-compose logs -f