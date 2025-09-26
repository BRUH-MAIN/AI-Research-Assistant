#!/bin/bash

# AI Research Assistant - Complete startup with ngrok
echo "🚀 Starting AI Research Assistant with ngrok tunnels..."

# Start Docker services
echo "🐳 Starting Docker services..."
./start-docker.sh

# Wait for services to be fully ready
echo "⏳ Waiting for all services to be ready..."
sleep 10

# Check if frontend is responding
echo "🔍 Checking if frontend is ready..."
timeout 30 bash -c 'until curl -f http://localhost:3000 &>/dev/null; do sleep 2; done' || {
    echo "❌ Frontend not ready. Check Docker logs."
    exit 1
}

echo "✅ Services are ready!"

# Start ngrok tunnel for frontend
echo "🌐 Starting ngrok tunnel for frontend..."
echo "📋 This will provide a public URL for Google OAuth"
echo ""

# Start ngrok in background and capture output
ngrok http 3000 --log=stdout &
NGROK_PID=$!

# Give ngrok time to start
sleep 5

echo ""
echo "🔧 ngrok Web Interface: http://localhost:4040"
echo "📱 Check the web interface for your public URL"
echo ""
echo "📋 Next steps:"
echo "   1. Copy the ngrok URL from http://localhost:4040"
echo "   2. Update Google OAuth console with the new URL"
echo "   3. Update your .env file with the ngrok URL"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait $NGROK_PID