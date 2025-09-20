# AI Research Assistant

A full-stack application for searching, downloading, and managing academic papers with ArXiv integration and intelligent chat functionality.

## Features

- 🔍 **Paper Search**: Search academic papers using ArXiv API
- 📄 **PDF Management**: Download and store papers locally
- 💬 **Chat Interface**: Discuss papers with AI assistance
- � **Group Management**: Collaborative research sessions
- �🗄️ **Database Integration**: PostgreSQL for data persistence
- � **Global Authentication**: Centralized user context system
- �🚀 **Modern Stack**: FastAPI backend + Next.js frontend

## Recent Updates

### 🎯 Global User Context System
The application now features a **centralized authentication system** that eliminates user state confusion and provides consistent authentication across all components. See [Global User Context Documentation](./docs/GLOBAL_USER_CONTEXT.md) for details.

### Key Improvements:
- ✅ **Eliminated authentication errors** ("Unable to get user information")
- ✅ **Simplified component development** with `useUser()` hook
- ✅ **Automatic ID mapping** between Supabase and internal database
- ✅ **Consistent user state** across entire application

## Architecture

- **Backend**: FastAPI with SQLAlchemy ORM
- **Frontend**: Next.js with TypeScript
- **Database**: PostgreSQL (Redis optional, disabled by default)
- **AI Integration**: Support for multiple AI providers
- **Paper Integration**: ArXiv API for academic paper search

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed

### 1. Clone and Start
```bash
git clone <repository-url>
cd Ai-Research-Assistant-local
./start-docker.sh
```

### 2. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Development Setup

### Using Docker (Recommended)
```bash
# Development mode with live reloading
./start-dev-docker.sh
```

### Manual Setup

#### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.template .env
# Edit .env with your configuration
python run.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Database Setup
1. Install and start PostgreSQL
2. Create database: `ai_research_db`
3. Update `DATABASE_URL` in `.env`

## Configuration

### Environment Variables

Create `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_research_db

# Data Directory
DATA_DIR=/path/to/store/pdfs

# AI Configuration (Optional)
GROQ_API_KEY=your_groq_api_key_here

# Redis Configuration (Optional - disabled by default)
ENABLE_REDIS_SYNC=false
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Redis Configuration

By default, Redis is **disabled** and the system uses PostgreSQL directly for all operations. To enable Redis:

1. Set `ENABLE_REDIS_SYNC=true` in your `.env` file
2. Ensure Redis is running and accessible
3. Configure Redis connection settings

## API Endpoints

### Papers
- `GET /api/v1/papers/search` - Search papers on ArXiv
- `POST /api/v1/papers/download` - Download paper from ArXiv
- `GET /api/v1/papers/` - List stored papers

### Chat
- `POST /api/v1/chat/send` - Send chat message
- `DELETE /api/v1/chat/session/{session_id}` - Delete chat session

## Project Structure

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLAlchemy models
│   │   └── services/       # Business logic
│   ├── .env.template       # Environment template
│   └── run.py              # Application entry point
├── frontend/               # Next.js frontend
│   ├── src/app/           # App router pages
│   ├── lib/               # Utilities
│   └── public/            # Static assets
├── docker-compose.yml      # Docker orchestration
├── start-docker.sh         # Production Docker startup
└── start-dev-docker.sh     # Development Docker startup
```

## Docker Services

The Docker setup includes:

- **postgres**: PostgreSQL database with persistent storage (port 5433)
- **backend**: FastAPI application server
- **frontend**: Next.js development server

## Troubleshooting

### Common Issues

1. **Port conflicts**: 
   - Frontend: 3000, Backend: 8000, PostgreSQL: 5433
   - If you have local PostgreSQL on 5432, Docker uses 5433 to avoid conflicts
2. **Database connection**: Check PostgreSQL is running and accessible
3. **Environment variables**: Verify `.env` file configuration

### Docker Issues

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild images
docker-compose build --no-cache

# Clean up
docker-compose down -v
```


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]
