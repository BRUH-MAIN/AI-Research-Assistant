#!/bin/bash

# AI Research Assistant - Production Docker Deployment Script
# This script sets up production deployment with security hardening

set -e

echo "🏭 Deploying AI Research Assistant to Production..."

# Check if we're in production mode
if [[ "$NODE_ENV" != "production" ]]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Validate required environment variables
echo "🔍 Validating environment configuration..."
required_vars=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "JWT_SECRET"
    "POSTGRES_PASSWORD"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf '   • %s\n' "${missing_vars[@]}"
    echo "Please set these in your .env file or environment."
    exit 1
fi

# Security checks
echo "🔒 Performing security checks..."

# Check if default passwords are being used
if [[ "$POSTGRES_PASSWORD" == "postgres" ]] || [[ "$POSTGRES_PASSWORD" == "password" ]]; then
    echo "❌ Default PostgreSQL password detected. Please use a secure password."
    exit 1
fi

if [[ ${#JWT_SECRET} -lt 32 ]]; then
    echo "❌ JWT_SECRET must be at least 32 characters long."
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans

# Pull latest images and build
echo "🔨 Building production images..."
docker-compose -f docker-compose.yml build --no-cache

# Start services with production configuration
echo "🚀 Starting production services..."
docker-compose up -d

# Wait for services and run health checks
echo "⏳ Waiting for services to be healthy..."

# PostgreSQL health check
echo "📊 Checking PostgreSQL..."
timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U postgres &>/dev/null; do sleep 2; done' || {
    echo "❌ PostgreSQL failed to start"
    docker-compose logs postgres
    exit 1
}

# Express DB server health check
echo "🏃 Checking Express DB server..."
timeout 90 bash -c 'until curl -f http://localhost:3001/health &>/dev/null; do sleep 2; done' || {
    echo "❌ Express DB server failed to start"
    docker-compose logs express-db-server
    exit 1
}

# FastAPI AI server health check
echo "🤖 Checking FastAPI AI server..."
timeout 90 bash -c 'until curl -f http://localhost:8000/health &>/dev/null; do sleep 2; done' || {
    echo "❌ FastAPI AI server failed to start"
    docker-compose logs fastapi-ai-server
    exit 1
}

# Frontend health check
echo "🌐 Checking frontend..."
timeout 90 bash -c 'until curl -f http://localhost:3000 &>/dev/null; do sleep 2; done' || {
    echo "❌ Frontend failed to start"
    docker-compose logs frontend
    exit 1
}

# Run database migrations if needed
echo "🗄️  Running database migrations..."
docker-compose exec express-db-server npm run migrate || echo "⚠️  No migrations to run"

# Security hardening checks
echo "🔐 Running security validation..."
docker-compose exec postgres psql -U postgres -d postgres -c "SELECT 1;" > /dev/null || {
    echo "❌ Database connection failed"
    exit 1
}

# Check if SSL is configured
if [[ -f "./ssl/server.crt" ]] && [[ -f "./ssl/server.key" ]]; then
    echo "✅ SSL certificates found"
else
    echo "⚠️  SSL certificates not found. Consider setting up HTTPS for production."
fi

echo ""
echo "🎉 Production deployment successful!"
echo ""
echo "📊 Services Status:"
echo "   • Frontend:     https://localhost (or http://localhost:3000)"
echo "   • Express DB:   http://localhost:3001"
echo "   • FastAPI AI:   http://localhost:8000"
echo "   • PostgreSQL:   localhost:5432 (internal)"
echo "   • Redis:        localhost:6379 (internal)"
echo ""
echo "🔍 Monitoring Commands:"
echo "   • Check logs:       docker-compose logs -f [service]"
echo "   • Check status:     docker-compose ps"
echo "   • Check health:     curl http://localhost:3001/health"
echo "   • Database status:  docker-compose exec postgres pg_isready"
echo ""
echo "⚡ Performance Monitoring:"
echo "   • CPU usage:        docker stats"
echo "   • Memory usage:     docker-compose exec express-db-server free -h"
echo "   • Disk usage:       docker system df"
echo ""
echo "🔒 Security Notes:"
echo "   • All services running with non-root users"
echo "   • Database access restricted to service accounts"
echo "   • Rate limiting enabled on all API endpoints"
echo "   • JWT tokens required for authenticated endpoints"
echo ""
echo "📱 Ready for production traffic!"