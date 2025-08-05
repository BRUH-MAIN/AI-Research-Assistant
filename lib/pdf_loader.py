import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings

from lib.chunker import chunker_agentic, chunker_recursive
from dotenv import load_dotenv
load_dotenv()



def load_pdf(file_path)->list[Document]:
    loader = PyPDFLoader(file_path)
    pages = []
    for page in loader.load():
        pages.append(page)
    return pages


def split_Document(document: list[Document],type = 'agentic'):
    if type == 'agentic':
        return chunker_agentic(document)
    if type == 'recursive':
        return chunker_recursive(document)
def get_embedding_function(mod = 1):
    if mod == 0:
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
    elif mod == 1:
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            max_retries=3,
            timeout=120,  # Increased timeout to handle potential delays
        )
    else:
        raise ValueError("Invalid embedding mode specified.")
    return embeddings
