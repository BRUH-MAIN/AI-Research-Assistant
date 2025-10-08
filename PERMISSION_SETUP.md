# Permission Setup Fix

## ✅ **Issue Resolution**

This repository now includes proper permission handling for Docker containers to prevent file permission issues when downloading/uploading files.

## 🔧 **Setup Instructions**

### For New Clones (VM, Different Machines)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BRUH-MAIN/Ai-Research-Assistant-local.git
   cd Ai-Research-Assistant-local
   ```

2. **Run the permission setup script:**
   ```bash
   ./setup-permissions.sh
   ```

3. **Configure your environment:**
   - Copy `.env.example` to `.env` (if not done automatically)
   - Add your API keys (Supabase, OpenAI, etc.)

4. **Start the services:**
   ```bash
   ./start-dev-docker.sh  # Development mode
   # OR
   ./start-docker.sh      # Production mode
   ```

### What the Setup Script Does

- Detects your current user ID and group ID
- Updates `.env` file with `USER_ID` and `GROUP_ID` variables
- Creates necessary directories with proper permissions
- Ensures Docker containers run with your user permissions

### Technical Details

The solution uses Docker build arguments to create container users with matching host user IDs:

```yaml
# docker-compose.yml
build:
  args:
    - USER_ID=${USER_ID:-1000}
    - GROUP_ID=${GROUP_ID:-1000}
```

```dockerfile
# Dockerfile.backend
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN groupadd -g $GROUP_ID aiuser && useradd -u $USER_ID -g $GROUP_ID -m aiuser
```

This ensures:
- ✅ No permission denied errors when downloading PDFs
- ✅ Proper file ownership on mounted volumes
- ✅ Works across different host environments (local, VM, cloud)
- ✅ Security maintained (non-root container execution)

### Troubleshooting

If you encounter permission issues:

1. **Re-run the setup script:**
   ```bash
   ./setup-permissions.sh
   ```

2. **Rebuild containers:**
   ```bash
   sudo docker-compose down
   sudo docker-compose build --no-cache fastapi-ai-server
   sudo docker-compose up -d
   ```

3. **Check current permissions:**
   ```bash
   ls -la data/
   echo "Your User ID: $(id -u)"
   echo "Your Group ID: $(id -g)"
   ```