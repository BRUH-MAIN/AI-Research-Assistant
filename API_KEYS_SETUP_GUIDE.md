# 🔑 API Keys Setup Guide for RAG Service

## Current Status
Your RAG service is running in Docker but needs API keys to function properly. You're seeing this error:
```
ValueError: COHERE_API_KEY not found in environment variables.
```

## 🚀 Quick Fix: Add Your API Keys

### 1. **Edit the `.env` file**
Replace the placeholder values in `/home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/.env`:

```bash
# Replace these placeholder values with your actual API keys:
PINECONE_API_KEY=your-pinecone-api-key-here          # ← Replace this
COHERE_API_KEY=your-cohere-api-key-here              # ← Replace this  
GEMINI_API_KEY=your-gemini-api-key-here              # ← Replace this (optional)
```

### 2. **Get Your API Keys**

#### **Pinecone API Key** (Required)
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Sign up/Login → Go to "API Keys" section
3. Create a new API key or copy existing one
4. Paste it in `.env`: `PINECONE_API_KEY=pc-xxxxxxx`

#### **Cohere API Key** (Required)  
1. Go to [Cohere Dashboard](https://dashboard.cohere.ai/)
2. Sign up/Login → Go to "API Keys" section
3. Create a new API key or copy existing one
4. Paste it in `.env`: `COHERE_API_KEY=xxxxxxxxxxxx`

#### **Groq API Key** (Already configured ✅)
Your Groq key is already set up and working.

#### **Gemini API Key** (Optional)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create API key
3. Paste it in `.env`: `GEMINI_API_KEY=xxxxxxxxxxxx`

### 3. **Restart the Docker Services**
After adding the API keys:

```bash
cd /home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local
docker-compose restart fastapi-ai-server
```

Or restart all services:
```bash
docker-compose down && docker-compose up -d
```

### 4. **Test the RAG Service**
Once restarted, test the health endpoint:
```bash
curl http://localhost:8000/api/v1/ai/health
```

You should see:
```json
{
  "status": "healthy",
  "api_keys_configured": true,
  "vector_store_connected": true,
  ...
}
```

## 🎯 What Each API Key Does

| API Key | Purpose | Cost |
|---------|---------|------|
| **Pinecone** | Vector database for document storage | Free tier: 1 index, 100K vectors |
| **Cohere** | Text embeddings + reranking | Free tier: 100 API calls/month |
| **Groq** | Fast LLM inference | Free tier: 30 requests/minute |
| **Gemini** | Alternative LLM (optional) | Free tier available |

## 🔒 Security Notes

- ✅ **API keys are already configured in Docker** to be passed securely
- ✅ **Keys are only in `.env` file** (not committed to git)
- ✅ **Environment variables are properly isolated** between services

## 🐛 Troubleshooting

### If you still get API key errors:
1. **Check the `.env` file**: Make sure no extra spaces around the `=`
2. **Restart Docker**: `docker-compose restart fastapi-ai-server`
3. **Check Docker logs**: `docker-compose logs fastapi-ai-server`

### If Pinecone errors occur:
- Make sure you've created a Pinecone index or let the service create one
- Verify your Pinecone API key has the correct permissions

## ✅ Success Indicators

Once working, you'll see:
- ✅ No more "API key not found" errors in Docker logs
- ✅ Health endpoint returns `"status": "healthy"`
- ✅ You can upload PDFs via `/api/v1/ai/documents/upload`
- ✅ You can ask questions via `/api/v1/ai/ask`

## 🎉 Ready to Use!

After adding the API keys, your RAG service will support:
- 📄 **PDF document upload and processing**
- 🔍 **Intelligent question answering**
- 🎯 **Research paper awareness**
- 📊 **Citation and section extraction**
- ⚡ **Hybrid search with reranking**