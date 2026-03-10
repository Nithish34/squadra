import httpx
from urllib.parse import urlparse, parse_qs

def get_token():
    print("--- Shopify Token Generator ---")
    print("We are going to extract your token directly from the example.com URL!")
    print("")
    
    client_id = input("1. Enter your app's Client ID: ").strip()
    client_secret = input("2. Enter your app's Client Secret: ").strip()
    
    print("\n⚠️  IMPORTANT: The code in the URL expires in 60 seconds!")
    print("If it has been longer than a minute, go back and click 'Install app' again to get a fresh URL.")
    url = input("\n3. Paste the full example.com... URL here: ").strip()
    
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    
    code = qs.get("code", [None])[0]
    shop = qs.get("shop", [None])[0]
    
    if not code or not shop:
        print("\n❌ Error: Invalid URL. We couldn't find the 'code' or 'shop' inside it.")
        return
        
    print(f"\nExchanging secret code for {shop}...")
    
    try:
        resp = httpx.post(
            f"https://{shop}/admin/oauth/access_token",
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code
            }
        )
        data = resp.json()
        
        if "access_token" in data:
            print(f"\n✅ SUCCESS! We bypassed the dashboard!")
            print(f"Your permanent SHOPIFY_ACCESS_TOKEN is: ")
            print(f"\n👉  {data['access_token']}  👈\n")
            print("Copy this into your .env file and you are fully done.")
        else:
            print(f"\n❌ Error from Shopify: {data}")
            print("This usually means the code expired because more than 60 seconds passed.")
            print("Just click 'Install app' one more time to get a fresh example.com link and run this script quickly!")
            
    except Exception as e:
        print(f"\n❌ Network error: {e}")

if __name__ == "__main__":
    get_token()
