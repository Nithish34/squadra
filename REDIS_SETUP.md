# Redis Setup Guide

## Using Docker Desktop

Redis is now configured to run in Docker for state management.

### Quick Start

```powershell
# Start Redis (from project root)
cd "c:\market intelligence"
docker-compose up -d

# Check if Redis is running
docker ps

# View Redis logs
docker logs market-intelligence-redis

# Stop Redis
docker-compose down

# Stop Redis and remove data
docker-compose down -v
```

### Verify Connection

```powershell
# Test Redis connection using Docker
docker exec -it market-intelligence-redis redis-cli ping
# Should return: PONG
```

### Troubleshooting

**Port already in use:**
```powershell
# Check what's using port 6379
netstat -ano | Select-String ":6379"

# Remove old containers
docker rm -f market-intelligence-redis
docker-compose up -d
```

**Backend can't connect:**
- Ensure Docker Desktop is running
- Check Redis container is healthy: `docker ps`
- Backend will automatically fall back to in-memory storage if Redis is unavailable

### Configuration

Redis connection is configured in `.env`:
```env
REDIS_URL=redis://localhost:6379
```

The application will:
1. Try to connect to Redis on startup
2. Fall back to in-memory storage (FakeRedis) if connection fails
3. State will persist across restarts when using real Redis

### Data Persistence

Redis data is stored in a Docker volume: `market intelligence_redis_data`

To backup/restore:
```powershell
# Backup
docker exec market-intelligence-redis redis-cli SAVE
docker cp market-intelligence-redis:/data/dump.rdb ./backup.rdb

# Restore
docker cp ./backup.rdb market-intelligence-redis:/data/dump.rdb
docker restart market-intelligence-redis
```
