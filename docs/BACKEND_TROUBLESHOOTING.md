# Backend Connectivity Troubleshooting Guide

## Overview

This guide helps resolve common connectivity issues between the frontend and backend services after the FastAPI migration.

## Quick Diagnosis

### 1. Identify the Problem

Run these commands to quickly identify what's not working:

```bash
# Check all Docker containers
docker ps -a

# Test FastAPI backend
curl -s http://localhost:8000/health

# Test Express backend
curl -s http://localhost:3001

# Test frontend
curl -s http://localhost:3000
```

### 2. Expected Results

✅ **Healthy System:**
```bash
# Docker containers should show:
fastapi-ai-server     (Up, healthy)
react-frontend        (Up)
express-db-server     (Up, healthy)
nginx-proxy           (Up)

# Health checks should return:
http://localhost:8000/health → {"status":"healthy"}
http://localhost:3001 → Express app response
http://localhost:3000 → Frontend HTML
```

## Common Issues and Solutions

### Issue 1: "Backend is not available" in Frontend

**Symptoms:**
- Browser console: `GET http://localhost:3001/ 404 (Not Found)`
- Chat interface shows "Backend is not available"
- Error in `chatService.ts:44`

**Root Cause:**
Frontend is still trying to connect to Express backend (3001) instead of FastAPI (8000).

**Solutions:**

1. **Verify ChatService Configuration:**
   ```bash
   # Check if chatService.ts has been updated
   grep -n "FASTAPI_URL\|3001\|8000" frontend/src/app/services/chatService.ts
   ```

2. **Clear Browser Cache:**
   ```bash
   # Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
   # Or clear cache and reload
   ```

3. **Restart Development Server:**
   ```bash
   # If running in development mode
   cd frontend && npm run dev
   ```

4. **Rebuild Docker Containers:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### Issue 2: FastAPI Backend Not Running

**Symptoms:**
- `curl http://localhost:8000/health` fails
- `docker ps` doesn't show `fastapi-ai-server`

**Solutions:**

1. **Check Container Status:**
   ```bash
   docker ps -a | grep fastapi
   ```

2. **Start FastAPI Container:**
   ```bash
   docker-compose up fastapi-ai-server
   ```

3. **Check Logs:**
   ```bash
   docker logs fastapi-ai-server
   ```

4. **Rebuild if Necessary:**
   ```bash
   docker-compose down
   docker-compose build fastapi-ai-server
   docker-compose up fastapi-ai-server
   ```

### Issue 3: AI Service Not Configured

**Symptoms:**
- Chat sessions create successfully
- AI responses show error messages
- Logs: "Error generating AI response: AI service not configured - missing GROQ_API_KEY"

**Solutions:**

1. **Set Environment Variable:**
   ```bash
   # Create .env file in project root
   echo "GROQ_API_KEY=your_api_key_here" >> .env
   ```

2. **Restart FastAPI Container:**
   ```bash
   docker-compose restart fastapi-ai-server
   ```

3. **Verify Environment Variable:**
   ```bash
   docker exec fastapi-ai-server env | grep GROQ
   ```

### Issue 4: Port Conflicts

**Symptoms:**
- "Port already in use" errors
- Services fail to start

**Solutions:**

1. **Check Port Usage:**
   ```bash
   lsof -i :8000
   lsof -i :3000
   lsof -i :3001
   ```

2. **Stop Conflicting Processes:**
   ```bash
   # Kill processes on specific ports
   sudo kill -9 $(lsof -t -i:8000)
   ```

3. **Use Different Ports:**
   ```bash
   # Modify docker-compose.yml port mapping
   # Example: "8001:8000" instead of "8000:8000"
   ```

### Issue 5: CORS (Cross-Origin) Errors

**Symptoms:**
- Browser console shows CORS policy errors
- Network requests blocked by browser

**Solutions:**

1. **Check FastAPI CORS Configuration:**
   ```python
   # In FastAPI app, ensure CORS middleware allows localhost:3000
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Verify Frontend URL:**
   ```bash
   # Ensure frontend is running on expected port
   curl -I http://localhost:3000
   ```

### Issue 6: Network Connectivity Issues

**Symptoms:**
- Containers can't communicate with each other
- Services unreachable from outside Docker

**Solutions:**

1. **Check Docker Network:**
   ```bash
   docker network ls
   docker network inspect ai-research-assistant-local_default
   ```

2. **Verify Container IPs:**
   ```bash
   docker inspect fastapi-ai-server | grep IPAddress
   docker inspect react-frontend | grep IPAddress
   ```

3. **Test Internal Connectivity:**
   ```bash
   # From inside express container, test FastAPI
   docker exec express-db-server curl http://fastapi-ai-server:8000/health
   ```

## Advanced Troubleshooting

### Debug Mode

1. **Enable Verbose Logging:**
   ```bash
   # Set debug environment variables
   docker-compose -f docker-compose.yml -f docker-compose.debug.yml up
   ```

2. **Check All Logs:**
   ```bash
   # View logs from all services
   docker-compose logs -f
   
   # View specific service logs
   docker-compose logs -f fastapi-ai-server
   docker-compose logs -f react-frontend
   ```

### Health Check Details

1. **FastAPI Detailed Health:**
   ```bash
   curl -s http://localhost:8000/api/v1/status | jq
   ```

2. **Test All Endpoints:**
   ```bash
   # Test session creation
   curl -X POST http://localhost:8000/api/v1/chat/sessions
   
   # Test with invalid session
   curl http://localhost:8000/api/v1/chat/invalid-id/history
   ```

### Reset Everything

If all else fails, perform a complete reset:

```bash
# Stop all containers
docker-compose down -v

# Remove all images
docker rmi $(docker images -q ai-research-assistant*)

# Clean Docker system
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## Monitoring and Prevention

### Regular Health Checks

Create a monitoring script:

```bash
#!/bin/bash
# health-check.sh

echo "=== System Health Check ==="
echo "FastAPI: $(curl -s http://localhost:8000/health || echo 'FAILED')"
echo "Express: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 || echo 'FAILED')"
echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'FAILED')"
echo "=========================="
```

### Log Monitoring

```bash
# Monitor all services
docker-compose logs -f --tail=100

# Monitor specific patterns
docker-compose logs -f | grep -E "(ERROR|WARN|error|failed)"
```

## Environment Checklist

Before reporting issues, verify:

- [ ] All required environment variables are set
- [ ] Docker containers are running and healthy
- [ ] Ports 3000, 3001, and 8000 are accessible
- [ ] Browser cache has been cleared
- [ ] Latest code changes have been applied
- [ ] GROQ_API_KEY is configured (for AI functionality)

## Getting Help

1. **Check Documentation:**
   - [FASTAPI_MIGRATION_GUIDE.md](./FASTAPI_MIGRATION_GUIDE.md)
   - [FASTAPI_QUICK_REFERENCE.md](./FASTAPI_QUICK_REFERENCE.md)

2. **Gather Information:**
   ```bash
   # Collect system info for debugging
   docker ps -a > debug-containers.txt
   docker-compose logs > debug-logs.txt
   curl -v http://localhost:8000/health > debug-health.txt 2>&1
   ```

3. **Common Logs Locations:**
   - FastAPI logs: `docker logs fastapi-ai-server`
   - Frontend logs: Browser developer console
   - Express logs: `docker logs express-db-server`

---

*Last updated: September 20, 2025*