# Nginx Configuration for Research Assistant

This directory contains the Nginx configuration for the Research Assistant application.

## Architecture

The application consists of three main services:

1. **Frontend (React/Next.js)** - Running on port 3000
2. **Express DB Server** - Running on port 3001
3. **FastAPI AI Server** - Running on port 8000

Nginx serves as a reverse proxy, routing traffic to these services based on URL paths:

- `/` - Routes to the frontend
- `/api/` - Routes to the Express DB server
- `/ai/` - Routes to the FastAPI AI server

## Configuration

The main configuration file is `nginx.conf`, which defines the reverse proxy settings, rate limiting, and security headers.

## SSL/TLS

To enable HTTPS:

1. Place your SSL certificate and key in the `ssl/` directory:
   - `ssl/cert.pem` - The SSL certificate
   - `ssl/key.pem` - The SSL private key

2. Update the `nginx.conf` file to use these certificates:

```nginx
server {
    listen 443 ssl;
    server_name bruhmain.3utilities.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Rest of the configuration...
}
```

## Running the Services

Use the provided `start-services.sh` script to build and start all services:

```bash
./start-services.sh
```

This script will:
1. Check for Docker and required files
2. Start all services using Docker Compose
3. Verify that all services are running

## Accessing the Application

After starting the services, access the application at:

- http://bruhmain.3utilities.com
