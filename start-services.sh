#!/bin/bash
set -e

# Define colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Research Assistant Services ===${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Create SSL directory if it doesn't exist (for future use)
if [ ! -d "./ssl" ]; then
  echo -e "${YELLOW}Creating SSL directory for future certificate use${NC}"
  mkdir -p ./ssl
fi

# Check if .env file exists
if [ ! -f "./.env" ]; then
  echo -e "${RED}Error: .env file not found.${NC}"
  echo -e "${YELLOW}Creating a sample .env file. Please update it with your configuration.${NC}"
  
  cat > ./.env <<'EOF'
# Environment Variables for Research Assistant
NODE_ENV=development

# Express DB Server
PORT=3001
DATABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# FastAPI AI Server
PYTHONPATH=/app
PYTHONUNBUFFERED=1
EXPRESS_DB_URL=http://express-db-server:3001
DATA_DIR=/app/data

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:80/api
NEXT_PUBLIC_AI_API_URL=http://localhost:80/ai
EOF

  echo -e "${YELLOW}Please edit the .env file before continuing.${NC}"
  exit 1
fi

# Start services using docker-compose
echo -e "${GREEN}Starting all services with Docker Compose...${NC}"
docker-compose down
docker-compose up --build -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 5

# Check if services are running
if [ "$(docker-compose ps -q nginx)" ]; then
  echo -e "${GREEN}Nginx is running.${NC}"
else
  echo -e "${RED}Nginx failed to start.${NC}"
fi

if [ "$(docker-compose ps -q express-db-server)" ]; then
  echo -e "${GREEN}Express DB Server is running.${NC}"
else
  echo -e "${RED}Express DB Server failed to start.${NC}"
fi

if [ "$(docker-compose ps -q fastapi-ai-server)" ]; then
  echo -e "${GREEN}FastAPI AI Server is running.${NC}"
else
  echo -e "${RED}FastAPI AI Server failed to start.${NC}"
fi

if [ "$(docker-compose ps -q frontend)" ]; then
  echo -e "${GREEN}Frontend is running.${NC}"
else
  echo -e "${RED}Frontend failed to start.${NC}"
fi

echo -e "${GREEN}=== Setup complete! ===${NC}"
echo -e "${YELLOW}Make sure you have an A record pointing bruhmain.3utilities.com to this server's public IP.${NC}"
echo -e "${GREEN}Then visit: http://bruhmain.3utilities.com/${NC}"
echo -e "${YELLOW}You can check logs with: docker-compose logs -f${NC}"
