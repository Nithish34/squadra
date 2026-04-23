import urllib.request
import urllib.error
import json
import uuid

BASE_URL = "http://localhost:8000/api"

def make_request(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=2) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body
    except Exception as e:
        return 0, str(e)

print("--- Testing API ---")

# 1. Health check
status, res = make_request("GET", "/health")
print(f"Health: {status}")

# 2. Register user A
email_a = f"test_{uuid.uuid4()}@test.com"
status, res = make_request("POST", "/auth/register", {"email": email_a, "password": "password123", "business_name": "Tenant A"})
print(f"Register A: {status}")

# Login user A
status, res_a = make_request("POST", "/auth/login", {"email": email_a, "password": "password123"})
print(f"Login A: {status}")
token_a = res_a.get("access_token")

# 3. Register user B
email_b = f"test_{uuid.uuid4()}@test.com"
status, res = make_request("POST", "/auth/register", {"email": email_b, "password": "password123", "business_name": "Tenant B"})
print(f"Register B: {status}")

# Login user B
status, res_b = make_request("POST", "/auth/login", {"email": email_b, "password": "password123"})
print(f"Login B: {status}")
token_b = res_b.get("access_token")

# 4. Create Mission as User A
mission_payload = {
    "business_name": "Tenant A",
    "niche": "fashion",
    "city": "Mumbai",
    "competitors": [{"name": "Zara", "url": "https://www.zara.com"}],
    "enable_scout_hitl": False
}
status, res_mission_a = make_request("POST", "/setup", mission_payload, token_a)
print(f"Create Mission A: {status} - {res_mission_a}")
mission_id_a = res_mission_a.get("mission_id")

# 5. IDOR Check: User B accesses User A's mission
if mission_id_a and token_b:
    status, res_idor = make_request("GET", f"/setup/{mission_id_a}", token=token_b)
    print(f"IDOR Check (User B getting Mission A): {status} - {res_idor}")

    status, res_stream = make_request("GET", f"/stream/{mission_id_a}?token={token_b}")
    print(f"IDOR Check Stream (User B getting Mission A stream): {status} - {res_stream}")
    
    status, res_graph = make_request("GET", f"/graph/{mission_id_a}", token=token_b)
    print(f"IDOR Check Graph (User B getting Mission A graph): {status} - {json.dumps(res_graph, ensure_ascii=True)}")
