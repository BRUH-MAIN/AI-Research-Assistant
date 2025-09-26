#!/bin/bash

# AI Research Assistant - Docker Startup Script
# This script stecho "   • Frontend:     http://localhost:3000"
echo "   • Express DB:   http://localhost:3001 (Database operations)"
echo "   • FastAPI AI:   http://localhost:8000 (AI/ML operations)"
echo "   • AI API Docs:  http://localhost:8000/docs"
echo "   • Supabase:     External (Local: http://127.0.0.1:54321)" "🔧 Management commands:"
echo "   • View logs:     docker-compose logs -f [service]"
echo "   • Stop services: docker-compose down"
echo "   • Restart:       docker-compose restart [service]"
echo "   • Supabase:      sudo npx supabase status"
echo ""
echo "🏗️  Architecture:"
echo "   Frontend → Express DB Server (3001) → Supabase PostgreSQL"
echo "   Frontend → FastAPI AI Server (8000) → AI/ML Models"
echo ""
echo "ℹ️  Note: Database operations handled by Express.js server via Supabase"
echo "         AI/ML operations handled by FastAPI server"
echo "         Ensure Supabase is running: sudo npx supabase start"e application stack using Docker Compose
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

# Note: Using Supabase for database - no local PostgreSQL health check needed
# Ensure Supabase is running separately before starting these services

# Wait for Express DB server to be ready
echo "🔧 Waiting for Express DB server..."
timeout 90 bash -c 'until curl -f http://localhost:3001/health &>/dev/null; do sleep 2; done' || {
    echo "❌ Express DB server failed to start within 90 seconds"
    docker-compose logs express-db-server
    exit 1
}

# Skip FastAPI AI server health check for now
echo "🤖 FastAPI AI server starting in background..."

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
echo "   • Express DB:   http://localhost:3001 (Database operations via Supabase)"
echo "   • FastAPI AI:   http://localhost:8000 (AI/ML operations)"
echo "   • AI API Docs:  http://localhost:8000/docs"
echo "   • Supabase:     External (Local: http://127.0.0.1:54321)"
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
