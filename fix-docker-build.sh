#!/bin/bash

# AI Research Assistant - Docker Build Fix Script
# Fixes DNS and network issues during Docker builds

set -e

echo "🔧 Fixing Docker build DNS and network issues..."

# Clean up any existing containers and images
echo "📦 Cleaning up existing containers and cache..."
sudo docker container prune -f 2>/dev/null || true
sudo docker image prune -f 2>/dev/null || true

# Configure Docker daemon for better DNS resolution
echo "🌐 Configuring Docker DNS settings..."
sudo mkdir -p /etc/docker
cat << 'EOF' | sudo tee /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"],
  "dns-search": [],
  "dns-opts": [],
  "features": {
    "buildkit": true
  }
}
EOF

# Restart Docker daemon
echo "🔄 Restarting Docker daemon..."
sudo systemctl restart docker
sleep 5

# Test network connectivity
echo "🔍 Testing network connectivity..."
if ! ping -c 1 pypi.org > /dev/null 2>&1; then
    echo "❌ Network connectivity issue detected!"
    echo "Please check your internet connection and try again."
    exit 1
fi

echo "✅ Network connectivity OK"

# Build with retry mechanism
echo "🚀 Building FastAPI AI server with retry mechanism..."

build_fastapi() {
    echo "Attempt $1 of 3..."
    
    # Check if BuildKit is available
    if sudo docker buildx version >/dev/null 2>&1; then
        echo "Using Docker BuildKit..."
        DOCKER_BUILDKIT=1 sudo docker build \
            --network=host \
            --progress=plain \
            --no-cache \
            -t fastapi-ai-server \
            -f Dockerfile.backend \
            ./backend
    else
        echo "Using legacy Docker builder..."
        sudo docker build \
            --no-cache \
            -t fastapi-ai-server \
            -f Dockerfile.backend \
            ./backend
    fi
}

# Retry build up to 3 times
for attempt in {1..3}; do
    if build_fastapi $attempt; then
        echo "✅ Build successful on attempt $attempt"
        break
    else
        if [ $attempt -eq 3 ]; then
            echo "❌ Build failed after 3 attempts"
            echo "💡 Alternative solution: Try building without lock file"
            
            # Backup lock file and try without it
            if [ -f "./backend/uv.lock" ]; then
                mv ./backend/uv.lock ./backend/uv.lock.backup
                echo "📋 Backed up uv.lock file"
                
                echo "🔄 Trying build without lock file..."
                if build_fastapi "4 (no-lock)"; then
                    echo "✅ Build successful without lock file"
                    echo "⚠️  Warning: Dependencies may differ from locked versions"
                    exit 0
                else
                    # Restore lock file
                    mv ./backend/uv.lock.backup ./backend/uv.lock
                    echo "❌ Build failed even without lock file"
                    echo "💡 Try installing Docker BuildKit for better network support:"
                    echo "   sudo apt-get update && sudo apt-get install docker-buildx-plugin"
                    exit 1
                fi
            else
                exit 1
            fi
        else
            echo "⏳ Waiting 10 seconds before retry..."
            sleep 10
        fi
    fi
done

echo "🎉 Docker build fix completed successfully!"