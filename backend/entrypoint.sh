#!/bin/bash
set -e

# Fix permissions for the mounted volume
# The Docker user (aiuser) needs to be able to write to the app directory
echo "Fixing permissions for development mode..."

# Create uv.lock if it doesn't exist with proper permissions
if [ ! -f "/app/uv.lock" ]; then
    echo "Creating uv.lock file..."
    touch /app/uv.lock
fi

# Ensure the current user can write to necessary files
# This is needed because the volume mount may override container permissions
if [ "$(id -u)" = "0" ]; then
    # Running as root - change ownership and then switch to aiuser
    chown -R aiuser:aiuser /app
    exec gosu aiuser "$@"
else
    # Already running as aiuser
    exec "$@"
fi