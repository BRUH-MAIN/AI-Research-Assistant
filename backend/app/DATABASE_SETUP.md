# AI Research Assistant - Database Setup Guide

## Quick Setup

### 1. Update Database Password

Replace `YOUR-PASSWORD` in the `.env` file with your actual PostgreSQL password:

```bash
# Option 1: Run the interactive setup script
python setup_db.py

# Option 2: Manually edit .env file
# Change this line in .env:
DATABASE_URL=postgresql://postgres:YOUR-ACTUAL-PASSWORD@127.0.0.1:5432/postgres
```

### 2. Create Database (if needed)

If you want to use a specific database name instead of 'postgres':

```sql
-- Connect to PostgreSQL as postgres user
psql -U postgres -h localhost

-- Create the database
CREATE DATABASE ai_research_db;

-- Grant permissions (if needed)
GRANT ALL PRIVILEGES ON DATABASE ai_research_db TO postgres;
```

Then update your `.env` file:
```
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@127.0.0.1:5432/ai_research_db
```

### 3. Test Database Connection

```bash
python test_db_connection.py
```

### 4. Initialize Database Schema

```bash
python init_db.py
```

### 5. Start the API Server

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Configuration Files

- `.env` - Your actual environment variables (not in git)
- `.env.example` - Template for environment variables
- `schema.sql` - Database schema definition
- `setup_db.py` - Interactive database setup script
- `test_db_connection.py` - Database connection test
- `init_db.py` - Database initialization script

## Troubleshooting

### PostgreSQL Not Running
```bash
# Check status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Enable auto-start
sudo systemctl enable postgresql
```

### Connection Issues
1. Verify PostgreSQL is listening on port 5432
2. Check if password is correct
3. Ensure database exists
4. Verify user permissions

### Permission Issues
```sql
-- Connect as superuser and grant permissions
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE your_db_name TO postgres;
```

## API Documentation

Once the server is running:
- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `ENVIRONMENT` | Application environment | development |
| `DEBUG` | Enable debug mode | True |
| `PROJECT_NAME` | API project name | AI Research Assistant API |
| `API_V1_STR` | API version prefix | /api/v1 |

## Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `groups` - User groups and organizations
- `sessions` - Chat/research sessions
- `messages` - Messages within sessions
- `papers` - Research papers metadata
- `session_papers` - Papers associated with sessions

For full schema details, see `db/schema.sql`.
