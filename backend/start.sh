#!/bin/bash

echo "🚀 Starting AI Research Assistant API..."
echo "📍 Make sure you have:"
echo "   1. Created root .env file (../env) with your API keys"
echo "   2. Installed dependencies: pip install -r requirements.txt"
echo ""

# Check if root .env exists
if [ ! -f ../.env ]; then
    echo "⚠️  Warning: root .env file not found!"
    echo "📝 Copy .env.example to ../.env and add your API keys"
    echo ""
fi

# Start the server
echo "🌐 Starting server on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo "🔍 Debug endpoints:"
echo "   - Redis status: http://localhost:8000/api/v1/debug/redis"
echo "   - Active sessions: http://localhost:8000/api/v1/debug/sessions"
echo ""

python run.py
