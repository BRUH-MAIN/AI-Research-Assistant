#!/bin/bash

# Simple Docker build fix for legacy Docker (no BuildKit)
# This script works with older Docker installations

set -e

echo "🔧 Simple Docker build fix (legacy compatible)..."

cd /home/bharath/Documents/project/Ai-Research-Assistant-local

# Configure Docker DNS if not already done
if [ ! -f /etc/docker/daemon.json ] || ! grep -q "8.8.8.8" /etc/docker/daemon.json 2>/dev/null; then
    echo "🌐 Configuring Docker DNS..."
    sudo mkdir -p /etc/docker
    echo '{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
}' | sudo tee /etc/docker/daemon.json
    
    echo "🔄 Restarting Docker..."
    sudo systemctl restart docker
    sleep 3
fi

echo "🚀 Building FastAPI service (legacy Docker)..."

# Simple build without BuildKit flags
sudo docker build \
    --no-cache \
    -t fastapi-ai-server \
    -f Dockerfile.backend \
    ./backend

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "Now you can run: sudo docker-compose up -d"
else
    echo "❌ Build failed. Trying without lock file..."
    
    # Backup lock file and try without it
    if [ -f "./backend/uv.lock" ]; then
        echo "📋 Backing up lock file and trying without it..."
        mv ./backend/uv.lock ./backend/uv.lock.backup
        
        # Try building without lock file
        sudo docker build \
            --no-cache \
            -t fastapi-ai-server \
            -f Dockerfile.backend \
            ./backend
        
        if [ $? -eq 0 ]; then
            echo "✅ Build successful without lock file!"
            echo "⚠️  Note: Dependency versions may differ from locked versions"
            echo "You can now run: sudo docker-compose up -d"
        else
            # Restore lock file
            mv ./backend/uv.lock.backup ./backend/uv.lock
            echo "❌ Build still failed."
            echo ""
            echo "🔍 Troubleshooting suggestions:"
            echo "1. Check internet connectivity: ping files.pythonhosted.org"
            echo "2. Try building on host directly: cd backend && uv sync"
            echo "3. Check for corporate firewall blocking PyPI"
            echo "4. Consider using a VPN if behind restrictive network"
            exit 1
        fi
    fi
fi

echo "🎉 Build completed!"