#!/usr/bin/env python3
"""
Database initialization script
Run this script to initialize the database with the schema from schema.sql
"""

import sys
import os
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

from db.db import initialize_database, test_database_connection, DB_AVAILABLE
from db.models import DatabaseModel
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Main initialization function"""
    try:
        logger.info("Starting database initialization...")
        
        if not DB_AVAILABLE:
            logger.warning("No PostgreSQL adapter available. The API will run with mock data.")
            logger.info("To enable database functionality, install psycopg or psycopg2:")
            logger.info("  pip install psycopg[binary]")
            logger.info("  or")
            logger.info("  pip install psycopg2-binary")
            return
        
        # Test database connection first
        if not test_database_connection():
            logger.error("Database connection failed. Please check your database configuration.")
            logger.info("Make sure PostgreSQL is running and the connection details are correct.")
            logger.info("Current DATABASE_URL setting: postgresql://postgres:mysecretpassword@localhost:5432/mydb")
            logger.info("You can override this with the DATABASE_URL environment variable.")
            logger.info("The API will fall back to using mock data.")
            return
        
        # Initialize database schema
        initialize_database()
        
        logger.info("Database initialization completed successfully!")
        logger.info("The API is now ready to use the PostgreSQL database.")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        logger.info("The API will fall back to using mock data.")

if __name__ == "__main__":
    main()
