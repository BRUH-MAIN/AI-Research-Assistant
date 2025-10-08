#!/bin/bash

# AI Research Assistant - ngrok Setup Script
echo "🚀 Setting up ngrok for AI Research Assistant..."

# Check if ngrok is authenticated
if ! ngrok config check > /dev/null 2>&1; then
    echo "❌ ngrok is not authenticated!"
    echo "Please:"
    echo "1. Sign up for a free ngrok account at https://ngrok.com/"
    echo "2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok config add-authtoken YOUR_AUTHTOKEN"
    echo ""
    echo "For free accounts, you get:"
    echo "  - 1 online ngrok process"
    echo "  - 4 tunnels/ngrok process"  
    echo "  - 40 connections/minute"
    exit 1
fi

echo "✅ ngrok is authenticated!"

# Start ngrok tunnels
echo "🌐 Starting ngrok tunnels for AI Research Assistant..."
echo ""
echo "Services will be available at:"
echo "  📱 Frontend: https://XXXXX-XX-XX-XXX-XXX.ngrok-free.app"
echo "  🗄️  DB Server: https://XXXXX-XX-XX-XXX-XXX.ngrok-free.app" 
echo "  🤖 AI Server: https://XXXXX-XX-XX-XXX-XXX.ngrok-free.app"
echo ""
echo "🔧 ngrok Web Interface: http://localhost:4040"
echo "📋 Copy the URLs from the web interface to update your environment"
echo ""

# Start ngrok with config file
ngrok start --config=./ngrok.yml --all