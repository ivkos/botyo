#!/bin/bash
set -e

NPM_PID=0
handle_sigterm() {
  if [ $NPM_PID -ne 0 ]; then

    if [ -f app.pid ]; then
        APP_PID=`cat app.pid`
        kill -SIGTERM "$APP_PID"
    else
        echo "App PID not found. Killing npm..."
        kill -SIGTERM "$NPM_PID"
    fi

    wait "$NPM_PID"
  fi

  exit 143;
}

trap handle_sigterm SIGTERM

exec "$@" & NPM_PID="$!"
wait "$NPM_PID"