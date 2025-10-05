"""
Legacy database connection module - NO LONGER USED
FastAPI no longer interacts with the database directly.
All database operations are handled by the Express DB service.

This file is kept for reference only and should be removed in future cleanup.
"""

import logging

logger = logging.getLogger(__name__)

# Database functionality has been moved to Express DB service
# This module is deprecated and should not be used

def legacy_warning():
    """Warn about deprecated database usage"""
    logger.warning(
        "Direct database access from FastAPI is deprecated. "
        "All database operations should go through Express DB service."
    )

# Compatibility stubs - these should not be used
DB_AVAILABLE = False

def run_query(*args, **kwargs):
    legacy_warning()
    return [] if kwargs.get('fetch') else None

def get_connection():
    legacy_warning()
    raise Exception("Direct database connections are no longer supported in FastAPI")

def initialize_database():
    legacy_warning()
    pass

def test_database_connection():
    legacy_warning()
    return False