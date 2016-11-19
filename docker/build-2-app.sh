#!/usr/bin/env bash

set -e

cd `dirname $0`

./build-1-node-deps.sh

docker build -t ivkos/botyo -f 2-app.dockerfile ../