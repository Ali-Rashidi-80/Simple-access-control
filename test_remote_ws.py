import asyncio
import websockets
import ssl

async def test_remote_ws():
    uri = "wss://rash32.ir/ws/hardware"
    print(f"Attempting connection to: {uri}")
    
    # Create a custom SSL context to allow debugging potentially self-signed or messy certs if needed
    # (Though rash32.ir seems to have a valid cert based on the curl logs, just handshake fails)
    ssl_context = ssl.create_default_context()
    # ssl_context.check_hostname = False
    # ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with websockets.connect(uri, ssl=ssl_context) as websocket:
            print("Successfully Connected via WSS!")
            await websocket.send('{"type":"ping"}')
            response = await websocket.recv()
            print(f"Received: {response}")
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"Connection Rejected: Status Code {e.status_code}")
        if e.status_code == 502:
            print("Analysis: 502 Bad Gateway. The Load Balancer cannot reach the Backend Container.")
    except Exception as e:
        print(f"Connection Failed: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_remote_ws())
