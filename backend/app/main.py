from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import users, logs
from .socket_manager import manager
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(title="SentryGate Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(users.router)
app.include_router(logs.router)

# Database Initialization
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized.")

@app.get("/")
def read_root():
    return {"message": "SentryGate Backend API Running"}

# WebSocket Endpoint
@app.websocket("/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str):
    """
    client_type: 'hardware' or 'frontend'
    """
    if client_type not in ["hardware", "frontend"]:
        await websocket.close()
        return

    await manager.connect(websocket, client_type)
    try:
        while True:
            data = await websocket.receive_json()
            
            if client_type == "hardware":
                # Process message from Hardware (RFID scan)
                await manager.process_hardware_message(data)
            
            elif client_type == "frontend":
                # Handle commands from Frontend (e.g. Remote Open)
                cmd = data.get("cmd")
                if cmd == "OPEN":
                    logger.info("Remote OPEN command received from Frontend")
                    await manager.send_to_hardware(data) # Forward complete payload (cmd + duration)

    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, client_type)
