#!/usr/bin/env bash

set -e

cd `dirname $0`

./build-0-backbone.sh

docker build -t ivkos/botyo-node-deps -f 1-node-deps.dockerfile ../