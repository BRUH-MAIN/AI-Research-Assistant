#!/bin/bash

# AI Research Assistant - Docker Startup Script
# This script starts the entire application stack using Docker Compose

set -e

echo "🚀 Starting AI Research Assistant..."

# Create data directory if it doesn't exist
mkdir -p ./data

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."

# Wait for backend to be ready
echo "🔧 Waiting for backend API..."
timeout 60 bash -c 'until curl -f http://localhost:8000/docs &>/dev/null; do sleep 2; done' || {
    echo "❌ Backend failed to start within 60 seconds"
    docker-compose logs backend
    exit 1
}

# Wait for frontend to be ready
echo "🌐 Waiting for frontend..."
timeout 60 bash -c 'until curl -f http://localhost:3000 &>/dev/null; do sleep 2; done' || {
    echo "❌ Frontend failed to start within 60 seconds"
    docker-compose logs frontend
    exit 1
}

echo ""
echo "✅ AI Research Assistant is now running!"
echo ""
echo "📊 Services:"
echo "   • Frontend:  http://localhost:3000"
echo "   • Backend:   http://localhost:8000"
echo "   • API Docs:  http://localhost:8000/docs"
echo "   • Database:  External PostgreSQL on 127.0.0.1:54322"
echo ""
echo "📁 Data directory: ./data"
echo ""
echo "🔧 Management commands:"
echo "   • View logs:     docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart:       docker-compose restart"
echo ""
echo "🎯 Redis is DISABLED (using PostgreSQL directly)"
echo "   To enable Redis, set ENABLE_REDIS_SYNC=true in docker-compose.yml"
echo ""
echo "ℹ️  Note: Using external PostgreSQL database on port 54322"
echo ""
