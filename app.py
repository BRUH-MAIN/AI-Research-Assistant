import argparse
import asyncio
from lib.db_manager import clear_database,add_to_chroma
from lib.pdf_loader import load_pdf,split_Document

async def main():
    file_path = 'LiteratureMiningLLM/EDLHLGA23009V012223.pdf'
    # Check if the database should be cleared (using the --clear flag).
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset the database.")
    args = parser.parse_args()
    if args.reset:
        print("✨ Clearing Database")
        clear_database()

    # Create (or update) the data store.
    documents = await load_pdf(file_path)
    chunks = split_Document(documents)
    add_to_chroma(chunks)

if __name__ == "__main__":
    
    asyncio.run(main())