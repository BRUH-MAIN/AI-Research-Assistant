#!/bin/bash

# Setup script for AI Research Assistant permissions
# This ensures proper file permissions across different environments

set -e

echo "🔧 Setting up permissions for AI Research Assistant..."

# Get current user ID and group ID
USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "📋 Host User ID: $USER_ID"
echo "📋 Host Group ID: $GROUP_ID"

# Create .env file with user/group IDs if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env || echo "Warning: .env.example not found, you'll need to create .env manually"
fi

# Add or update USER_ID and GROUP_ID in .env
if ! grep -q "USER_ID=" .env; then
    echo "" >> .env
    echo "# Docker permissions" >> .env
    echo "USER_ID=$USER_ID" >> .env
    echo "GROUP_ID=$GROUP_ID" >> .env
else
    # Update existing values
    sed -i "s/USER_ID=.*/USER_ID=$USER_ID/" .env
    sed -i "s/GROUP_ID=.*/GROUP_ID=$GROUP_ID/" .env
fi

# Create data directory if it doesn't exist
mkdir -p data/input

# Set proper permissions for data directory
echo "📁 Setting permissions for data directory..."

# Check if we need sudo for chown
if ! chown -R $USER_ID:$GROUP_ID data/ 2>/dev/null; then
    echo "⚠️  Need sudo to fix existing permissions..."
    if command -v sudo >/dev/null 2>&1; then
        sudo chown -R $USER_ID:$GROUP_ID data/
        echo "✅ Permissions fixed with sudo"
    else
        echo "❌ Cannot fix permissions - sudo not available"
        echo "   Please run: sudo chown -R $USER_ID:$GROUP_ID data/"
        echo "   Or manually delete and recreate the data directory"
    fi
else
    echo "✅ Permissions set successfully"
fi

# Make scripts executable
chmod +x *.sh 2>/dev/null || true

echo "✅ Permissions setup complete!"
echo ""
echo "🚀 You can now run:"
echo "   ./start-dev-docker.sh   # For development with live reload"
echo "   ./start-docker.sh       # For production mode"
echo ""
echo "📝 Note: The containers will now run with your user ID ($USER_ID)"
echo "   This ensures proper file permissions for downloads and uploads."