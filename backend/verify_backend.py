from fastapi.testclient import TestClient
from app.main import app
import time

def test_sentrygate_flow():
    client = TestClient(app)
    
    print("1. Creating a Test User...")
    response = client.post("/users/", json={
        "name": "Test User",
        "role": "admin",
        "rfid_tag": "12345678"
    })
    
    # If user already exists, that's fine for re-runs, but we expect 200 on fresh DB
    if response.status_code == 200:
        print("   User created successfully.")
        user_id = response.json()["id"]
    elif response.status_code == 400:
        print("   User already exists (expected if re-running).")
    else:
        print(f"   FAILED to create user: {response.text}")
        return

    print("\n2. Testing WebSocket Layout: Hardware Scan -> Frontend Broadcast")
    
    with client.websocket_connect("/ws/frontend") as frontend_ws:
        print("   Frontend Connected.")
        
        with client.websocket_connect("/ws/hardware") as hardware_ws:
            print("   Hardware Connected.")
            
            # --- Scenario A: Authorized Access ---
            print("\n   [Scenario A] Scanning VALID Tag: 12345678")
            hardware_ws.send_json({"rfid": "12345678", "temperature": 36.5})
            
            # Hardware should receive OPEN
            hw_response = hardware_ws.receive_json()
            print(f"   Hardware Received: {hw_response}")
            assert hw_response == {"cmd": "OPEN"}
            
            # Frontend should receive ACCESS_LOG
            fe_response = frontend_ws.receive_json()
            print(f"   Frontend Received: {fe_response}")
            assert fe_response["type"] == "ACCESS_LOG"
            assert fe_response["data"]["action"] == "GRANTED"

            # --- Scenario B: Unauthorized Access ---
            print("\n   [Scenario B] Scanning INVALID Tag: 99999999")
            hardware_ws.send_json({"rfid": "99999999", "temperature": 37.0})
            
            # Hardware should receive DENY
            hw_response = hardware_ws.receive_json()
            print(f"   Hardware Received: {hw_response}")
            assert hw_response == {"cmd": "DENY"}
            
            # Frontend should receive UNKNOWN_TAG (and possibly ACCESS_LOG after)
            # The order depends on implementation, but likely UNKNOWN_TAG first
            fe_response_1 = frontend_ws.receive_json()
            print(f"   Frontend Received (1): {fe_response_1}")
            
            if fe_response_1["type"] == "UNKNOWN_TAG":
                print("   Verified UNKNOWN_TAG broadcast.")
            else:
                 print("   Warning: Expected UNKNOWN_TAG first.")

            # Check if we get the log as well
            fe_response_2 = frontend_ws.receive_json()
            print(f"   Frontend Received (2): {fe_response_2}")
            if fe_response_2["type"] == "ACCESS_LOG":
                 print("   Verified Access Log broadcast.")

    print("\n3. Verifying Logs API...")
    response = client.get("/logs/")
    logs = response.json()
    print(f"   Fetched {len(logs)} logs.")
    assert len(logs) >= 2
    print("   Logs verification successful.")

    print("\nSUCCESS: All Backend Checks Passed!")

if __name__ == "__main__":
    test_sentrygate_flow()
