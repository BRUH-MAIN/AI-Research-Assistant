#!/bin/bash

# AI Research Assistant - Development Environment Setup
# This script sets up the development environment with live reloading
# Updated for Express.js + FastAPI separated architecture

set -e

echo "🔧 Setting up AI Research Assistant Development Environment..."
echo "📐 Architecture: Express DB Server + FastAPI AI Server"

# Create data directory if it doesn't exist
mkdir -p ./data

# Check for environment file
if [[ ! -f .env ]]; then
    echo "⚠️  Warning: .env file not found. Creating from .env.example..."
    if [[ -f .env.example ]]; then
        cp .env.example .env
        echo "📝 Please edit .env with your configuration before continuing."
        echo "   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET"
        read -p "Press Enter when .env is configured..."
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build images
echo "🔨 Building Docker images..."
docker-compose build

# Start services in development mode
echo "🚀 Starting services in development mode..."
docker-compose up

echo ""
echo "ℹ️  Development mode includes:"
echo "   • Live reloading for frontend (Next.js)"
echo "   • Live reloading for Express DB server (nodemon)"
echo "   • Live reloading for FastAPI AI server (uvicorn --reload)"
echo "   • Volume mounts for instant code changes"
echo "   • PostgreSQL with persistent data"
echo "   • Redis for caching and sessions"
echo "   • Supabase integration for authentication"
echo ""
echo "🏗️  Service Architecture:"
echo "   Frontend (3000) → Express DB (3001) → PostgreSQL"
echo "   Frontend (3000) → FastAPI AI (8000) → AI Models"
echo ""
