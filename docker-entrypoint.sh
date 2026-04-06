#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions
if [ ! -d "/app/data" ]; then
  mkdir -p /app/data
fi

# Fix permissions if running as root (for docker-compose volume mounts)
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data
  # Switch to node user and execute the command
  exec su-exec node "$@"
else
  # Already running as non-root user
  exec "$@"
fi
