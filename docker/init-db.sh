#!/bin/bash
set -e

# Database initialization script for Docker
echo "🗄️ Initializing database schema..."

# Wait for PostgreSQL to be ready
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "✅ PostgreSQL is ready. Running schema..."

# Run the schema file
PGPASSWORD=password psql -h postgres -U postgres -d ai_research_db -f /docker-entrypoint-initdb.d/schema.sql

echo "✅ Database schema initialized successfully!"
