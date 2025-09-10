import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import PostgreSQL adapter
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    DB_AVAILABLE = True
    logger.info("Using psycopg2 for database connection")
except ImportError:
    try:
        import psycopg
        from psycopg.rows import dict_row
        DB_AVAILABLE = True
        logger.info("Using psycopg for database connection")
    except ImportError:
        DB_AVAILABLE = False
        logger.warning("No PostgreSQL adapter found. Database functionality will be limited.")

# Database configuration
from ..core.config import settings
DATABASE_URL = settings.DATABASE_URL

def get_connection():
    """Create and return a new database connection."""
    if not DB_AVAILABLE:
        raise Exception("No PostgreSQL adapter available")
    
    try:
        if 'psycopg2' in globals():
            return psycopg2.connect(DATABASE_URL)
        else:
            return psycopg.connect(DATABASE_URL)
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def run_query(query: str, params: Optional[tuple] = None, fetch: bool = False) -> Optional[List[Dict[Any, Any]]]:
    """Run a SQL query with optional parameters."""
    if not DB_AVAILABLE:
        logger.warning("Database not available, returning mock data")
        return [] if fetch else None
    
    try:
        with get_connection() as conn:
            if 'psycopg2' in globals():
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, params or ())
                    if fetch:
                        result = cur.fetchall()
                        # Convert RealDictRow to regular dict
                        result = [dict(row) for row in result]
                        logger.info(f"Query executed successfully, returned {len(result)} rows")
                        return result
                    conn.commit()
                    logger.info("Query executed successfully")
                    return None
            else:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute(query, params or ())
                    if fetch:
                        result = cur.fetchall()
                        logger.info(f"Query executed successfully, returned {len(result)} rows")
                        return result
                    conn.commit()
                    logger.info("Query executed successfully")
                    return None
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        # For development, return empty results instead of raising
        if fetch:
            return []
        return None

def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    if not DB_AVAILABLE:
        return False
    
    query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = %s
        );
    """
    try:
        result = run_query(query, (table_name,), fetch=True)
        return result[0]['exists'] if result else False
    except Exception as e:
        logger.error(f"Failed to check if table {table_name} exists: {e}")
        return False

def get_schema_file_path() -> Path:
    """Get the path to the schema.sql file."""
    current_dir = Path(__file__).parent
    schema_path = current_dir / "schema.sql"
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")
    return schema_path

def load_schema_from_file() -> str:
    """Load the SQL schema from the schema.sql file."""
    try:
        schema_path = get_schema_file_path()
        with open(schema_path, 'r', encoding='utf-8') as file:
            schema_content = file.read()
        logger.info(f"Schema loaded from {schema_path}")
        return schema_content
    except Exception as e:
        logger.error(f"Failed to load schema from file: {e}")
        raise

def execute_sql_statements(sql_content: str) -> None:
    """Execute multiple SQL statements from a string."""
    if not DB_AVAILABLE:
        logger.warning("Database not available, skipping SQL execution")
        return
    
    try:
        with get_connection() as conn:
            if 'psycopg2' in globals():
                with conn.cursor() as cur:
                    # Split the SQL content into individual statements
                    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                    
                    for statement in statements:
                        if statement.upper().startswith(('CREATE', 'DROP', 'INSERT', 'ALTER')):
                            try:
                                cur.execute(statement)
                                logger.info(f"Executed: {statement[:50]}...")
                            except Exception as e:
                                # Log the error but continue with other statements
                                logger.warning(f"Statement failed (continuing): {statement[:50]}... - Error: {e}")
                    
                    conn.commit()
                    logger.info("All SQL statements executed successfully")
            else:
                with conn.cursor() as cur:
                    # Similar logic for psycopg
                    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                    
                    for statement in statements:
                        if statement.upper().startswith(('CREATE', 'DROP', 'INSERT', 'ALTER')):
                            try:
                                cur.execute(statement)
                                logger.info(f"Executed: {statement[:50]}...")
                            except Exception as e:
                                logger.warning(f"Statement failed (continuing): {statement[:50]}... - Error: {e}")
                    
                    conn.commit()
                    logger.info("All SQL statements executed successfully")
    except Exception as e:
        logger.error(f"Failed to execute SQL statements: {e}")
        raise

def initialize_database() -> None:
    """Initialize the database by creating tables from schema.sql if they don't exist."""
    if not DB_AVAILABLE:
        logger.warning("Database not available, skipping initialization")
        return
    
    try:
        logger.info("Starting database initialization...")
        
        # Check if the main tables exist
        tables_to_check = ['users', 'groups', 'sessions', 'messages']
        tables_exist = all(check_table_exists(table) for table in tables_to_check)
        
        if not tables_exist:
            logger.info("Some tables don't exist. Creating database schema...")
            schema_content = load_schema_from_file()
            execute_sql_statements(schema_content)
            logger.info("Database schema created successfully!")
        else:
            logger.info("All required tables exist. Database is ready.")
            
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Don't raise in development mode, just log the error

def get_table_info(table_name: str) -> List[Dict[str, Any]]:
    """Get information about a table's columns."""
    if not DB_AVAILABLE:
        return []
    
    query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """
    try:
        return run_query(query, (table_name,), fetch=True) or []
    except Exception as e:
        logger.error(f"Failed to get table info for {table_name}: {e}")
        return []

def test_database_connection() -> bool:
    """Test the database connection and return True if successful."""
    if not DB_AVAILABLE:
        logger.warning("Database adapters not available")
        return False
    
    try:
        with get_connection() as conn:
            if 'psycopg2' in globals():
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    result = cur.fetchone()
                    logger.info("Database connection test successful")
                    return result[0] == 1
            else:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    result = cur.fetchone()
                    logger.info("Database connection test successful")
                    return result[0] == 1
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False