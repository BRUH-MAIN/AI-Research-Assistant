#!/bin/bash

# Quick DNS fix for Docker build issues
# Run this if you're getting DNS resolution errors during builds

echo "🔧 Quick DNS fix for Docker build..."

# Test current connectivity
echo "Testing network connectivity..."
if ping -c 1 files.pythonhosted.org > /dev/null 2>&1; then
    echo "✅ Network connectivity to PyPI is OK"
else
    echo "❌ Cannot reach PyPI - checking DNS..."
fi

# Configure Docker DNS if needed
if [ ! -f /etc/docker/daemon.json ] || ! grep -q "8.8.8.8" /etc/docker/daemon.json 2>/dev/null; then
    echo "🌐 Configuring Docker DNS..."
    sudo mkdir -p /etc/docker
    echo '{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"],
  "features": {
    "buildkit": true
  }
}' | sudo tee /etc/docker/daemon.json
    
    echo "🔄 Restarting Docker..."
    sudo systemctl restart docker
    sleep 3
fi

# Try building just the FastAPI service with better network settings
echo "🚀 Attempting to build FastAPI service..."

cd /home/bharath/Documents/project/Ai-Research-Assistant-local

# Check if BuildKit is available and use appropriate build command
if sudo docker buildx version >/dev/null 2>&1; then
    echo "Using Docker BuildKit..."
    DOCKER_BUILDKIT=1 sudo docker build \
        --network=host \
        --progress=plain \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -t fastapi-ai-server \
        -f Dockerfile.backend \
        ./backend
else
    echo "Using legacy Docker builder..."
    sudo docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -t fastapi-ai-server \
        -f Dockerfile.backend \
        ./backend
fi

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "Now you can run: sudo docker-compose up -d"
else
    echo "❌ Build failed. Trying alternative approach..."
    
    # Backup lock file and try without it
    if [ -f "./backend/uv.lock" ]; then
        echo "📋 Trying without lock file..."
        mv ./backend/uv.lock ./backend/uv.lock.backup
        
        # Try building without lock file using appropriate builder
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
        
        if [ $? -eq 0 ]; then
            echo "✅ Build successful without lock file!"
            echo "⚠️  Note: Dependency versions may differ from locked versions"
        else
            # Restore lock file
            mv ./backend/uv.lock.backup ./backend/uv.lock
            echo "❌ Build still failed. Please check network connectivity."
            exit 1
        fi
    fi
fi