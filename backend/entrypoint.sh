#!/bin/bash
set -e

# Delete old server.pid if exists
rm -f /rails/tmp/pids/server.pid

# Start the Rails server
exec "$@"