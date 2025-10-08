#!/bin/bash

# Simple ngrok tunnel for frontend only
echo "🚀 Starting ngrok tunnel for frontend (port 3000)..."
echo "📋 This will give you a public URL for Google OAuth"
echo ""

# Start single tunnel for frontend
ngrok http 3000 --log=stdout