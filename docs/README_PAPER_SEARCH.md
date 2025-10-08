# Paper Search & Download System

A comprehensive system for searching, downloading, and managing research papers with PostgreSQL database integration and ArXiv fallback.

## Features

- 🔍 **Smart Search**: Search papers by name, title, authors, and tags
- 📚 **Database Integration**: Store and retrieve papers from PostgreSQL database
- 📄 **ArXiv Integration**: Automatic fallback to ArXiv when papers aren't found locally
- ⬇️ **PDF Download**: Download papers directly from ArXiv to local storage
- 🏷️ **Tag Management**: Add and manage tags for better organization
- 🌐 **Debug Frontend**: Simple web interface for testing and debugging

## Architecture

### Backend Components

1. **ArXiv Service** (`app/services/arxiv_service.py`)
   - Search ArXiv papers by title, authors, keywords
   - Download PDFs to local data directory
   - Extract metadata (title, abstract, authors, categories)

2. **Enhanced Paper Manager** (`app/db/postgres_manager/managers/papers.py`)
   - Search database by name and tags
   - Manage paper-tag relationships
   - CRUD operations for papers

3. **Enhanced API Endpoints** (`app/api/v1/papers.py`)
   - `/papers/search` - Search papers in DB and ArXiv
   - `/papers/download-from-arxiv` - Download and store papers
   - `/papers/{id}` - Get paper with tags

### Frontend Components

1. **Paper Search Page** (`frontend/src/app/papers/page.tsx`)
   - Search interface with name and tag filters
   - Display database and ArXiv results
   - Download and tag management

## Database Schema

The system uses the existing `papers` and `paper_tags` tables:

```sql
-- Papers table
CREATE TABLE papers (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors TEXT,
    doi TEXT UNIQUE,
    published_at TIMESTAMP,
    source_url TEXT
);

-- Paper tags table
CREATE TABLE paper_tags (
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (paper_id, tag)
);
```

## API Endpoints

### Search Papers
```
POST /api/v1/papers/search
Content-Type: application/json

{
  "name": "machine learning",      // Optional: search in title/authors
  "tags": ["AI", "cs.LG"]         // Optional: filter by tags
}
```

**Response:**
```json
{
  "found_in_db": true,
  "papers": [
    {
      "paper_id": 1,
      "title": "...",
      "authors": "...",
      "abstract": "...",
      "tags": ["AI", "machine learning"]
    }
  ],
  "arxiv_results": [...]  // If no DB results found
}
```

### Download from ArXiv
```
POST /api/v1/papers/download-from-arxiv
Content-Type: application/json

{
  "arxiv_id": "2301.00001",
  "add_tags": ["AI", "custom-tag"]  // Optional
}
```

## Installation & Setup

1. **Install Backend Dependencies**
   ```bash
   cd backend
   uv sync
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Setup Environment Variables**
   Create `.env` file in backend directory:
   ```
   DATABASE_URL=postgresql://user:password@localhost/dbname
   DATA_DIR=/home/bharath/Documents/DBMS/data
   ```

4. **Create Data Directory**
   ```bash
   mkdir -p /home/bharath/Documents/DBMS/data
   ```

## Running the Application

### Quick Start
```bash
./start_paper_search.sh
```

### Manual Start

1. **Start Backend**
   ```bash
   cd backend
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

### Access Points
- **Frontend**: http://localhost:3000
- **Paper Search**: http://localhost:3000/papers
- **API Documentation**: http://localhost:8000/docs
- **Backend API**: http://localhost:8000

## Usage Examples

### 1. Search for AI Papers
1. Go to http://localhost:3000/papers
2. Enter "artificial intelligence" in the name field
3. Add tags like "AI, machine learning"
4. Click "Search Papers"

### 2. Download from ArXiv
1. If no database results are found, ArXiv results will appear
2. Click "Download & Add to Database" on any ArXiv paper
3. Optionally add custom tags
4. The paper will be downloaded and stored locally

### 3. API Usage
```python
import requests

# Search papers
response = requests.post("http://localhost:8000/api/v1/papers/search", 
                        json={"name": "transformer", "tags": ["cs.AI"]})
results = response.json()

# Download paper
response = requests.post("http://localhost:8000/api/v1/papers/download-from-arxiv", 
                        json={"arxiv_id": "1706.03762", "add_tags": ["attention"]})
```

## File Structure

```
Ai-Research-Assistant-local/
├── backend/
│   ├── app/
│   │   ├── api/v1/papers.py          # Enhanced papers API
│   │   ├── services/arxiv_service.py  # ArXiv integration
│   │   ├── db/postgres_manager/
│   │   │   ├── managers/papers.py     # Enhanced paper manager
│   │   │   └── schemas.py             # Updated schemas
│   │   └── core/config.py             # Configuration
│   └── pyproject.toml                 # Dependencies
├── frontend/
│   └── src/app/
│       ├── page.tsx                   # Updated home page
│       └── papers/page.tsx            # Paper search interface
├── data/                              # PDF storage directory
├── test_paper_search.py              # Test script
├── start_paper_search.sh             # Startup script
└── README_PAPER_SEARCH.md            # This file
```

## Dependencies

### Backend
- `arxiv` - ArXiv API client
- `requests` - HTTP requests
- `fastapi` - API framework
- `sqlalchemy` - Database ORM
- `psycopg2-binary` - PostgreSQL driver

### Frontend
- `next.js` - React framework
- `tailwindcss` - Styling

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure you're using `uv run` for backend commands
   - Check virtual environment activation

2. **Database connection errors**
   - Verify `DATABASE_URL` in environment variables
   - Ensure PostgreSQL is running

3. **ArXiv search fails**
   - Check internet connection
   - ArXiv API may have rate limits

4. **PDF download issues**
   - Ensure data directory exists and is writable
   - Check disk space

### Testing

Run the test script to verify functionality:
```bash
cd backend
uv run python ../test_paper_search.py
```

## Future Enhancements

- [ ] Full-text search in PDFs
- [ ] Citation analysis
- [ ] Paper recommendation system
- [ ] Batch download functionality
- [ ] Advanced filtering options
- [ ] Export/import capabilities
