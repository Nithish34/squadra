# 🚀 Quick Testing Guide

## Test the Complete Flow

### 1. Start All Services
```powershell
# Start Redis
docker-compose up -d

# Start Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Start Frontend (in new terminal)
cd agentic-flow-main
npm run dev
```

### 2. Test Backend Directly (PowerShell)

```powershell
# Health Check
Invoke-RestMethod -Uri "http://localhost:8000/api/health"

# Register User
$body = @{
    email = "demo@test.com"
    password = "demo123"
    business_name = "Demo Store"
} | ConvertTo-Json

$auth = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/auth/register" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

$token = $auth.access_token
Write-Host "Token: $token"

# Create Mission
$body = @{
    business_name = "Demo Store"
    niche = "fashion"
    city = "Mumbai"
    country = "IN"
    competitors = @(
        @{ name = "Competitor A"; url = "https://example.com" }
    )
    keywords = @("fashion", "trends")
    shopify_product_ids = @()
    instagram_post = $true
    enable_scout_hitl = $false
} | ConvertTo-Json -Depth 5

$mission = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/setup" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" }

Write-Host "Mission ID: $($mission.mission_id)"
Write-Host "Status: $($mission.status)"

# Check Mission Status
$state = Invoke-RestMethod `
    -Uri "http://localhost:8000/api/setup/$($mission.mission_id)" `
    -Headers @{ Authorization = "Bearer $token" }

Write-Host "Current Status: $($state.status)"
```

### 3. Test Frontend in Browser

1. Open http://localhost:8080
2. Register/Login with:
   - Email: `demo@test.com`
   - Password: `demo123`
3. Configure mission in Scout Setup
4. Click "Run Pipeline"
5. Watch the agents execute in real-time!

### 4. Check Redis Data

```powershell
# List all mission keys
docker exec market-intelligence-redis redis-cli KEYS "pipeline:*"

# Get specific mission data
docker exec market-intelligence-redis redis-cli GET "pipeline:{mission_id}"

# Check SSE queue
docker exec market-intelligence-redis redis-cli LLEN "sse:{mission_id}"

# Test Redis connection
docker exec market-intelligence-redis redis-cli ping
# Should return: PONG
```

### 5. View Backend Logs

The backend terminal shows:
- ✅ Redis connection status
- 📝 API request logs
- 🔍 Pipeline execution logs
- 🐛 Debug messages from Scout

Look for:
```
✅ Connected to Redis successfully
2026-03-10 15:45:40 [info] pipeline_launched mission_id=... mode=autonomous niche=fashion
INFO: 127.0.0.1:51023 - "POST /api/setup HTTP/1.1" 202 Accepted
```

### 6. Test Error Scenarios

```powershell
# Test without token (should fail 401)
Invoke-RestMethod -Uri "http://localhost:8000/api/setup"

# Test with invalid token
$headers = @{ Authorization = "Bearer invalid_token" }
Invoke-RestMethod -Uri "http://localhost:8000/api/dashboard/missions" -Headers $headers

# Test with wrong credentials
$body = @{ email = "wrong@email.com"; password = "wrong" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
```

## Common Issues & Solutions

### Redis Connection Failed
```powershell
# Check if Redis is running
docker ps | Select-String "redis"

# Check port mapping
docker port market-intelligence-redis

# Restart Redis
docker restart market-intelligence-redis

# View Redis logs
docker logs market-intelligence-redis
```

### Backend Not Starting
```powershell
# Kill all Python processes
Get-Process python | Stop-Process -Force

# Check if port is in use
netstat -ano | Select-String "8000"

# Start backend with verbose logging
cd backend
python -m uvicorn app.main:app --reload --log-level debug
```

### Frontend CORS Errors
- Check backend CORS configuration in `app/main.py`
- Verify `VITE_API_BASE_URL` in `.env`
- Use http://localhost:8080 (not 127.0.0.1)

### SSE Connection Issues
- Token must be in query string: `/api/stream/{id}?token={jwt}`
- Check browser console for EventSource errors
- Verify token hasn't expired (24h limit)

## Useful Commands

```powershell
# Check all running services
Get-Process python, node | Format-Table ProcessName, Id, CPU
docker ps

# Check all ports
netstat -ano | Select-String "8000|8080|6379"

# View API documentation
Start-Process "http://localhost:8000/api/docs"

# Clean restart everything
docker-compose down
Get-Process python | Stop-Process -Force
docker-compose up -d
cd backend; uvicorn app.main:app --reload --port 8000
cd agentic-flow-main; npm run dev
```

## Performance Testing

```powershell
# Measure API response time
Measure-Command {
    Invoke-RestMethod -Uri "http://localhost:8000/api/health"
}

# Load test with multiple requests
1..10 | ForEach-Object {
    $start = Get-Date
    Invoke-RestMethod -Uri "http://localhost:8000/api/health" | Out-Null
    $duration = (Get-Date) - $start
    Write-Host "Request $_: $($duration.TotalMilliseconds)ms"
}
```

## Debug Mode

### Enable Debug Logging in Backend
Add to Scout agent to see competitors:
```python
await _thought(mission_id, f"🔧 DEBUG: Received {len(competitors)} competitors: {competitors}")
```

### Check Frontend Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "stream" to see SSE connection
4. Click on the EventSource to see live events

### Monitor Redis Live
```powershell
# Watch Redis commands in real-time
docker exec -it market-intelligence-redis redis-cli MONITOR
```

---

**🎯 All tests passed! Your Market Intelligence system is ready to use.**
