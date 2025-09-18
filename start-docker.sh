#!/bin/bash

# AI Research Assistant - Docker Startup Script
# This script starts the entire application stack using Docker Compose
# Updated for Express.js + FastAPI separated architecture

set -e

echo "🚀 Starting AI Research Assistant (Express + FastAPI Architecture)..."

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

# Check for required environment variables
if [[ ! -f .env ]]; then
    echo "⚠️  Warning: .env file not found. Please copy .env.example to .env and configure."
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL to be ready
echo "🗄️  Waiting for PostgreSQL..."
timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U postgres &>/dev/null; do sleep 2; done' || {
    echo "❌ PostgreSQL failed to start within 60 seconds"
    docker-compose logs postgres
    exit 1
}

# Wait for Express DB server to be ready
echo "🔧 Waiting for Express DB server..."
timeout 90 bash -c 'until curl -f http://localhost:3001/health &>/dev/null; do sleep 2; done' || {
    echo "❌ Express DB server failed to start within 90 seconds"
    docker-compose logs express-db-server
    exit 1
}

# Wait for FastAPI AI server to be ready
echo "🤖 Waiting for FastAPI AI server..."
timeout 90 bash -c 'until curl -f http://localhost:8000/health &>/dev/null; do sleep 2; done' || {
    echo "❌ FastAPI AI server failed to start within 90 seconds"
    docker-compose logs fastapi-ai-server
    exit 1
}

# Wait for frontend to be ready
echo "🌐 Waiting for frontend..."
timeout 90 bash -c 'until curl -f http://localhost:3000 &>/dev/null; do sleep 2; done' || {
    echo "❌ Frontend failed to start within 90 seconds"
    docker-compose logs frontend
    exit 1
}

echo ""
echo "✅ AI Research Assistant is now running!"
echo ""
echo "📊 Services:"
echo "   • Frontend:     http://localhost:3000"
echo "   • Express DB:   http://localhost:3001 (Database operations)"
echo "   • FastAPI AI:   http://localhost:8000 (AI/ML operations)"
echo "   • AI API Docs:  http://localhost:8000/docs"
echo "   • PostgreSQL:   localhost:5432 (internal)"
echo "   • Redis:        localhost:6379 (internal)"
echo ""
echo "📁 Data directory: ./data"
echo ""
echo "🔧 Management commands:"
echo "   • View logs:     docker-compose logs -f [service]"
echo "   • Stop services: docker-compose down"
echo "   • Restart:       docker-compose restart [service]"
echo "   • DB status:     docker-compose exec postgres pg_isready"
echo ""
echo "�️  Architecture:"
echo "   Frontend → Express DB Server (3001) → Supabase PostgreSQL"
echo "   Frontend → FastAPI AI Server (8000) → AI/ML Models"
echo ""
echo "ℹ️  Note: Database operations now handled by Express.js server"
echo "         AI/ML operations handled by FastAPI server"
echo ""
