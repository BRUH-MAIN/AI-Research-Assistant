# How to Run Schema in Docker

This guide provides multiple ways to run the `schema.sql` file in your Docker setup.

## 🚀 Automatic Schema Initialization (Recommended)

The Docker setup is now configured to **automatically** run the schema when you start the containers for the first time.

### How it works:
- The `schema.sql` file is mounted into PostgreSQL's initialization directory
- PostgreSQL automatically runs all `.sql` files in `/docker-entrypoint-initdb.d/` on first startup
- Tables and data are created automatically

### To use:
```bash
# Clean start (removes existing data)
sudo docker-compose down -v

# Start with automatic schema initialization
sudo docker-compose up --build
```

## 🔧 Manual Schema Execution

If you need to run the schema manually, here are several options:

### Option 1: Using Docker Exec (Container Running)
```bash
# Copy schema to container and run
sudo docker-compose exec postgres psql -U postgres -d ai_research_db -f /docker-entrypoint-initdb.d/01-schema.sql
```

### Option 2: Using Docker Run (One-time Command)
```bash
# Run schema from host machine
sudo docker-compose exec postgres psql -U postgres -d ai_research_db -c "\i /docker-entrypoint-initdb.d/01-schema.sql"
```

### Option 3: Interactive PostgreSQL Session
```bash
# Start interactive psql session
sudo docker-compose exec postgres psql -U postgres -d ai_research_db

# Inside psql, run:
\i /docker-entrypoint-initdb.d/01-schema.sql
\q
```

### Option 4: From Host Machine (if PostgreSQL client installed)
```bash
# Connect to Docker PostgreSQL from host
PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d ai_research_db -f backend/app/db/postgres_manager/schema.sql
```

## 🗄️ Database Connection Details

- **Host**: localhost (from host machine) or `postgres` (from other containers)
- **Port**: 5433 (external), 5432 (internal)
- **Database**: ai_research_db
- **Username**: postgres
- **Password**: password

## 🔍 Verify Schema Installation

Check if tables were created:
```bash
# List all tables
sudo docker-compose exec postgres psql -U postgres -d ai_research_db -c "\dt"

# Check specific table
sudo docker-compose exec postgres psql -U postgres -d ai_research_db -c "SELECT COUNT(*) FROM users;"
```

## 🔄 Reset Database

To completely reset and re-run schema:
```bash
# Stop containers and remove volumes
sudo docker-compose down -v

# Start fresh (schema runs automatically)
sudo docker-compose up --build
```

## 🐛 Troubleshooting

### Schema not running automatically?
1. Ensure you've removed existing volumes: `sudo docker-compose down -v`
2. Check file permissions: `ls -la backend/app/db/postgres_manager/schema.sql`
3. Check container logs: `sudo docker-compose logs postgres`

### Tables already exist error?
- The schema includes `DROP TABLE IF EXISTS` statements, so this shouldn't happen
- If it does, reset the database using the reset steps above

### Permission denied?
- Make sure you're using `sudo` with docker commands
- Check that the schema file is readable: `chmod 644 backend/app/db/postgres_manager/schema.sql`

## 📁 File Locations

- **Schema File**: `backend/app/db/postgres_manager/schema.sql`
- **Docker Mount**: `/docker-entrypoint-initdb.d/01-schema.sql` (inside container)
- **Data Volume**: `postgres_data` (persistent storage)

## ✅ Automatic Initialization Features

The current setup automatically:
1. 🗄️ Creates the `ai_research_db` database
2. 📋 Runs the complete schema with all tables
3. 👤 Creates the AI user for the chat system
4. 🔍 Sets up all indexes for optimal performance
5. 🔗 Establishes foreign key relationships
6. ✅ Handles Redis-detached mode compatibility

## 🚀 Quick Start Commands

```bash
# Complete setup from scratch
sudo docker-compose down -v          # Clean slate
sudo docker-compose up --build       # Build and start with schema

# Check everything is working
curl "http://localhost:8000/docs"     # API documentation
curl "http://localhost:3000"          # Frontend
```

That's it! The schema will be automatically initialized on first run. 🎉