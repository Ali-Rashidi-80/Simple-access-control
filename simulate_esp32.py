import asyncio
import websockets
import json

async def simulate_hardware():
    uri = "ws://127.0.0.1:8000/ws/hardware"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to Backend!")

            # 1. Send Telemetry
            telemetry_msg = {
                "type": "telemetry",
                "temperature": 45.5
            }
            await websocket.send(json.dumps(telemetry_msg))
            print(f"Sent Telemetry: {telemetry_msg}")

            # 2. Simulate Scan
            scan_msg = {
                "type": "scan",
                "rfid": "ADMIN_TAG_001", # Matches the admin user we seeded
                "temperature": 46.0
            }
            print(f"Sending Scan: {scan_msg}")
            await websocket.send(json.dumps(scan_msg))

            # 3. Wait for Command (OPEN)
            while True:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"Received Command: {response}")
                    data = json.loads(response)
                    if data.get("cmd") == "OPEN":
                        print("SUCCESS: Received OPEN command!")
                        break
                except asyncio.TimeoutError:
                    print("Timeout waiting for response.")
                    break
    except Exception as e:
        print(f"Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(simulate_hardware())
