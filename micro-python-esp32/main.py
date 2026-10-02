import network
import uasyncio as asyncio
import machine
from machine import WDT, PWM, Pin, SPI
import json
import gc
import random
import time
from mfrc522 import MFRC522

# SSL Support
try:
    import ussl
except ImportError:
    try:
        import ssl as ussl
    except ImportError:
        print("[SYS] Warning: SSL not available")
        ussl = None

# ==========================================
# 0. CREDENTIALS & CONFIG LOAD
# ==========================================
def load_config():
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"[SYS] Error loading config.json: {e}")
        return None

CONFIG = load_config()

if not CONFIG:
    print("[SYS] CRITICAL: config.json missing or invalid. Copy config.example.json to config.json.")
    WIFI_SSID = ""
    WIFI_PASS = ""
    SERVER_HOST = "rynix.ir"
    SERVER_PORT = 443
    USE_SSL = True
    WS_PATH = "/ws/hardware"
else:
    WIFI_SSID = CONFIG.get("wifi_ssid", "")
    WIFI_PASS = CONFIG.get("wifi_pass", "")
    SERVER_HOST = CONFIG.get("server_host", "rynix.ir")
    SERVER_PORT = CONFIG.get("server_port", 443)
    USE_SSL = CONFIG.get("use_ssl", True)
    WS_PATH = CONFIG.get("ws_path", "/ws/hardware")

if USE_SSL:
    WS_URL = "wss://{}{}".format(SERVER_HOST, WS_PATH)
    if SERVER_PORT != 443:
         WS_URL = "wss://{}:{}{}".format(SERVER_HOST, SERVER_PORT, WS_PATH)
else:
    WS_URL = "ws://{}:{}{}".format(SERVER_HOST, SERVER_PORT, WS_PATH)

# Temperature Calibration
VREF = 3.580 

# ==========================================
# 1. PINOUT CONFIGURATION
# ==========================================
SCK_PIN = 18
MISO_PIN = 19
MOSI_PIN = 23
CS_PIN = 5
RST_PIN = 4

PERIPHERALS = dict(
    RELAY = 15,
    BUZZER = 17,
    TEMP_ADC = 34
)

# ==========================================
# 2. ROBUST ASYNC WEBSOCKET CLIENT
# ==========================================
class AsyncWSClient:
    def __init__(self, uri):
        self.uri = uri
        self.reader = None
        self.writer = None
        self.open = False
        self.ssl = False
        self.sock = None

    async def connect(self):
        try:
            proto, dummy, host, path = self.uri.split("/", 3)
            port = 80
            if proto == "wss:":
                self.ssl = True
                port = 443
            
            if ":" in host:
                host, port = host.split(":")
                port = int(port)
            
            print(f"[WS] Connecting to {host}:{port} ({'SSL' if self.ssl else 'TCP'})...")
            
            self.reader, self.writer = await asyncio.open_connection(host, port, ssl=self.ssl)
            
            # WebSocket Handshake
            key = "dGhlIHNhbXBsZSBub25jZQ=="
            req = (
                "GET /{} HTTP/1.1\r\n"
                "Host: {}:{}\r\n"
                "Connection: Upgrade\r\n"
                "Upgrade: websocket\r\n"
                "Sec-WebSocket-Key: {}\r\n"
                "Sec-WebSocket-Version: 13\r\n"
                "\r\n"
            ).format(path, host, port, key)
            
            self.writer.write(req.encode())
            await self.writer.drain()
            
            # Read Handshake Response
            while True:
                line = await self.reader.readline()
                if line == b"\r\n":
                    break
                if not line:
                    raise OSError("Handshake failed: No response")
            
            self.open = True
            print("[WS] Connected!")
            return True
        except Exception as e:
            print(f"[WS] Connect Failed: {e}")
            self.close()
            return False

    async def send(self, data):
        if not self.open: return
        try:
            frame = bytearray()
            frame.append(0x81) # Text Frame
            length = len(data)
            if length < 126:
                frame.append(0x80 | length)
            else:
                frame.append(0x80 | 126)
                frame.extend(length.to_bytes(2, 'big'))
            
            mask = bytes([random.getrandbits(8) for _ in range(4)])
            frame.extend(mask)
            
            masked_data = bytearray(length)
            for i in range(length):
                masked_data[i] = data[i] ^ mask[i % 4]
            frame.extend(masked_data)
            
            self.writer.write(frame)
            await self.writer.drain()
        except Exception as e:
            print(f"[WS] Send Error: {e}")
            self.close()

    async def _send_pong(self, payload=b""):
        """Send a WebSocket PONG frame (RFC 6455 compliance)."""
        if not self.open: return
        try:
            frame = bytearray()
            frame.append(0x8A)  # 0x80 (FIN) | 0x0A (Pong opcode)
            length = len(payload)
            frame.append(0x80 | length)  # Masked
            
            mask = bytes([random.getrandbits(8) for _ in range(4)])
            frame.extend(mask)
            
            if length > 0:
                masked_data = bytearray(length)
                for i in range(length):
                    masked_data[i] = payload[i] ^ mask[i % 4]
                frame.extend(masked_data)
            
            self.writer.write(frame)
            await self.writer.drain()
        except Exception as e:
            print(f"[WS] Pong Error: {e}")

    async def read_exactly(self, n, timeout_sec=30):
        """Read exactly n bytes with timeout to prevent infinite blocking."""
        data = b""
        try:
            while len(data) < n:
                chunk = await asyncio.wait_for(
                    self.reader.read(n - len(data)),
                    timeout=timeout_sec
                )
                if not chunk:
                    raise OSError("Connection closed during read")
                data += chunk
        except asyncio.TimeoutError:
            raise OSError("Read timeout")
        return data

    async def recv(self):
        if not self.open: return None
        try:
            # Read first byte (FIN + Opcode)
            data = await self.read_exactly(1)
            byte1 = data[0]
            opcode = byte1 & 0x0f
            
            # Handle Close Frame (opcode 0x8)
            if opcode == 0x8:
                # Consume close payload before closing
                data = await self.read_exactly(1)
                byte2 = data[0]
                length = byte2 & 0x7f
                if length > 0:
                    await self.read_exactly(length)  # Consume close reason
                print("[WS] Server sent Close Frame")
                self.close()
                return None
            
            # Handle Ping - MUST respond with Pong (RFC 6455)
            if opcode == 0x9:
                data = await self.read_exactly(1)
                byte2 = data[0]
                length = byte2 & 0x7f
                payload = b""
                if length > 0:
                    payload = await self.read_exactly(length)
                # Send Pong with same payload
                await self._send_pong(payload)
                return None
            
            # Handle Pong (opcode 0xA) - ignore, just consume
            if opcode == 0xA:
                data = await self.read_exactly(1)
                byte2 = data[0]
                length = byte2 & 0x7f
                if length > 0:
                    await self.read_exactly(length)
                return None

            # Read second byte (Mask + Length)
            data = await self.read_exactly(1)
            byte2 = data[0]
            length = byte2 & 0x7f
            
            if length == 126:
                data = await self.read_exactly(2)
                length = int.from_bytes(data, 'big')
            elif length == 127:
                data = await self.read_exactly(8)
                length = int.from_bytes(data, 'big')
            
            # Read Payload
            if length > 0:
                payload = await self.read_exactly(length)
                try:
                    return payload.decode('utf-8')
                except (UnicodeError, ValueError) as decode_err:
                    print(f"[WS] Payload decode error: {decode_err}")
                    return None
            return "" # Empty frame
            
        except Exception as e:
            print(f"[WS] Recv Error: {e}")
            self.close()
            return None

    def close(self):
        """Close connection and release resources."""
        self.open = False
        if self.writer:
            try:
                self.writer.close()
            except Exception as close_err:
                print(f"[WS] Notice during stream close: {close_err}")
        self.writer = None
        self.reader = None

# ==========================================
# 3. HARDWARE MANAGERS
# ==========================================
class HardwareManager:
    def __init__(self):
        # Relay
        self.relay = machine.Pin(PERIPHERALS['RELAY'], machine.Pin.OUT)
        self.relay.value(0) 
        
        # Buzzer (PWM)
        self.buzzer = PWM(Pin(PERIPHERALS['BUZZER']))
        self.buzzer.duty_u16(0)
        
        # Temp Sensor
        self.adc = machine.ADC(machine.Pin(PERIPHERALS['TEMP_ADC']))
        self.adc.atten(machine.ADC.ATTN_11DB)
        
        # RFID
        try:
            # Explicit Reset
            rst = Pin(RST_PIN, Pin.OUT)
            rst.off()
            time.sleep(0.05)
            rst.on()
            time.sleep(0.05)
            
            # SPI Init
            spi = SPI(1, baudrate=2500000, polarity=0, phase=0, sck=Pin(SCK_PIN), mosi=Pin(MOSI_PIN), miso=Pin(MISO_PIN))
            self.rdr = MFRC522(spi=spi, cs=Pin(CS_PIN, Pin.OUT))
            print("[HW] RFID Initialized")
        except Exception as e:
            print(f"[HW] RFID Init Error: {e}")
            self.rdr = None

    def read_temp(self):
        try:
            samples = [self.adc.read() for _ in range(10)]
            avg_reading = sum(samples) / len(samples)
            voltage = (avg_reading / 4095.0) * VREF
            temp_k = voltage * 100 
            temp_c = temp_k - 273.15
            return round(temp_c, 1)
        except Exception as temp_err:
            print(f"[HW] Temp sensor read error: {temp_err}")
            return 0.0

    async def _sound(self, freq, duration_sec):
        if freq < 50: freq = 50
        self.buzzer.freq(int(freq))
        self.buzzer.duty_u16(32768) 
        await asyncio.sleep(duration_sec)

    async def _silence(self, duration_sec):
        self.buzzer.duty_u16(0)
        await asyncio.sleep(duration_sec)

    async def play_success(self):
        print("[SND] Success: Magic Chime")
        melody = [659, 830, 987, 1318] 
        for i in range(3):
            await self._sound(melody[i], 0.08) 
            await self._silence(0.02)          
        await self._silence(0.03)
        await self._sound(melody[3], 0.3)      
        await self._silence(0.1)

    async def play_error(self):
        print("[SND] Error: System Fail")
        await self._sound(440, 0.15)
        await self._sound(311, 0.3)
        for f in range(311, 50, -30):
            self.buzzer.freq(int(f))
            await asyncio.sleep(0.01)
        await self._silence(0.2)

    async def play_startup(self):
        await self._sound(1000, 0.1)
        await self._silence(0.1)
        await self._sound(1000, 0.1)
        await self._silence(0.1)

    async def open_door(self, duration=3):
        print(f"[HW] Opening Door for {duration}s...")
        asyncio.create_task(self.play_success()) 
        self.relay.value(1)
        await asyncio.sleep(duration) 
        self.relay.value(0)

    async def access_denied(self):
        print("[HW] Access Denied")
        await self.play_error()

# ==========================================
# 4. MAIN ASYNC LOGIC
# ==========================================
async def ws_receiver(ws, hw):
    while True:
        if ws.open:
            msg = await ws.recv()
            if msg:
                print(f"[WS] Rx: {msg}")
                try:
                    data = json.loads(msg)
                    cmd = data.get("cmd")
                    if cmd == "OPEN":
                        duration = data.get("duration", 3)
                        asyncio.create_task(hw.open_door(duration))
                    elif cmd == "DENY":
                        asyncio.create_task(hw.access_denied())
                    elif cmd == "PONG":
                         pass # Heartbeat response
                except Exception as e:
                    print(f"[WS] JSON Parse Error: {e} | Raw: {msg}")
        await asyncio.sleep(0.05)

async def telemetry_sender(ws, hw):
    while True:
        if ws.open:
            try:
                temp = hw.read_temp()
                msg = json.dumps({
                    "type": "telemetry",
                    "temperature": temp 
                }).encode()
                await ws.send(msg)
                #print(f"[TEL] Sent temperature: {temp}°C")
            except Exception as e:
                print(f"[TEL] Error sending telemetry: {e}")
        await asyncio.sleep(30)

async def ping_sender(ws):
    """Send periodic ping to keep the WebSocket connection alive."""
    while True:
        if ws.open:
            try:
                msg = json.dumps({"type": "ping"}).encode()
                await ws.send(msg)
            except Exception as ping_err:
                print(f"[WS] Ping send failed: {ping_err}")
                ws.close()
        await asyncio.sleep(15)

async def system_runner():
    print("[SYS] Initializing Watchdog (15s)...")
    try:
        wdt = WDT(timeout=15000) 
    except Exception as wdt_err:
        print(f"[SYS] Watchdog unavailable: {wdt_err}")
        wdt = None

    hw = HardwareManager()
    print(f"[SYS] Target WebSocket: {WS_URL}")
    ws = AsyncWSClient(WS_URL)
    
    await hw.play_startup()
    
    asyncio.create_task(ws_receiver(ws, hw))
    asyncio.create_task(telemetry_sender(ws, hw))
    asyncio.create_task(ping_sender(ws))
    
    wifi_retry_count = 0
    print(f"[SYS] System Runner Started.")
    
    while True:
        if wdt: wdt.feed()

        sta = network.WLAN(network.STA_IF)
        if not sta.isconnected():
            print(f"[NET] WiFi Down. Reconnecting to {WIFI_SSID}...")
            sta.active(True)
            sta.connect(WIFI_SSID, WIFI_PASS)
            
            for _ in range(20): 
                if sta.isconnected(): break
                await asyncio.sleep(0.5)
            
            if not sta.isconnected():
                wifi_retry_count += 1
                if wifi_retry_count > 10:
                    print("[SYS] REBOOTING...")
                    machine.reset()
            else:
                 wifi_retry_count = 0
                 print(f"[NET] Reconnected! IP: {sta.ifconfig()[0]}")
        else:
            wifi_retry_count = 0
            
            if not ws.open:
                print("[WS] Connecting...")
                if await ws.connect():
                    await hw.play_success()
                else:
                    await asyncio.sleep(5)
            
            # RFID Loop
            if hw.rdr:
                try:
                    (stat, tag_type) = hw.rdr.request(hw.rdr.REQIDL)
                    if stat == hw.rdr.OK:
                        (stat, uid) = hw.rdr.anticoll()
                        if stat == hw.rdr.OK:
                            uid_str = "0x%02x%02x%02x%02x" % (uid[0], uid[1], uid[2], uid[3])
                            print(f"[RFID] Scanned: {uid_str}")
                            
                            payload = json.dumps({
                                "type": "scan",
                                "rfid": uid_str,
                                "temperature": hw.read_temp()
                            }).encode()
                            await ws.send(payload)
                            await asyncio.sleep(1.5) 
                except Exception as e:
                    print(f"[RFID] Err: {e}")
                    
        gc.collect()
        await asyncio.sleep(0.1)

if __name__ == "__main__":
    try:
        asyncio.run(system_runner())
    except KeyboardInterrupt:
        print("Stopped")
    except Exception as e:
        print(f"Critical Error: {e}")
        machine.reset()

