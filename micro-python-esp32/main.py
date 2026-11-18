import network
try:
    import uasyncio as asyncio
except ImportError:
    import asyncio
import machine
from machine import WDT, PWM, Pin, SPI
import json
import gc
import random
import time
from mfrc522 import MFRC522

import allowlist
import keypad as keypad_mod
import ntp_time
import softap

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
        with open("config.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print("[SYS] Error loading config.json:", e)
        return None


CONFIG = load_config()

if not CONFIG:
    print("[SYS] CRITICAL: config.json missing or invalid. Using defaults/failing.")
    WIFI_SSID = ""
    WIFI_PASS = ""
    SERVER_HOST = "your-server.example.com"
    SERVER_PORT = 443
    USE_SSL = True
    WS_PATH = "/ws/hardware"
    HARDWARE_TOKEN = ""
    KEYPAD_ENABLED = True
    SOFTAP_SSID = "SentryGate-Setup"
    SOFTAP_PASS = ""
else:
    WIFI_SSID = CONFIG.get("wifi_ssid", "")
    WIFI_PASS = CONFIG.get("wifi_pass", "")
    SERVER_HOST = CONFIG.get("server_host", "your-server.example.com")
    SERVER_PORT = CONFIG.get("server_port", 443)
    USE_SSL = CONFIG.get("use_ssl", True)
    WS_PATH = CONFIG.get("ws_path", "/ws/hardware")
    HARDWARE_TOKEN = CONFIG.get("hardware_token", "")
    KEYPAD_ENABLED = CONFIG.get("keypad_enabled", True)
    SOFTAP_SSID = CONFIG.get("softap_ssid", "SentryGate-Setup")
    SOFTAP_PASS = CONFIG.get("softap_pass", "")

if HARDWARE_TOKEN:
    sep = "&" if "?" in WS_PATH else "?"
    WS_PATH = "{}{}token={}".format(WS_PATH, sep, HARDWARE_TOKEN)

if USE_SSL:
    WS_URL = "wss://{}{}".format(SERVER_HOST, WS_PATH)
    if SERVER_PORT != 443:
        WS_URL = "wss://{}:{}{}".format(SERVER_HOST, SERVER_PORT, WS_PATH)
else:
    WS_URL = "ws://{}:{}{}".format(SERVER_HOST, SERVER_PORT, WS_PATH)

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
    RELAY=15,
    BUZZER=17,
    TEMP_ADC=34,
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

            print("[WS] Connecting to {}:{} ({})...".format(
                host, port, "SSL" if self.ssl else "TCP"))

            self.reader, self.writer = await asyncio.open_connection(
                host, port, ssl=self.ssl)

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
            print("[WS] Connect Failed:", e)
            self.close()
            return False

    async def send(self, data):
        if not self.open:
            return False
        try:
            if isinstance(data, str):
                data = data.encode("utf-8")
            frame = bytearray()
            frame.append(0x81)
            length = len(data)
            if length < 126:
                frame.append(0x80 | length)
            else:
                frame.append(0x80 | 126)
                frame.extend(length.to_bytes(2, "big"))

            mask = bytes([random.getrandbits(8) for _ in range(4)])
            frame.extend(mask)

            masked_data = bytearray(length)
            for i in range(length):
                masked_data[i] = data[i] ^ mask[i % 4]
            frame.extend(masked_data)

            self.writer.write(frame)
            await self.writer.drain()
            return True
        except Exception as e:
            print("[WS] Send Error:", e)
            self.close()
            return False

    async def _send_pong(self, payload=b""):
        if not self.open:
            return
        try:
            frame = bytearray()
            frame.append(0x8A)
            length = len(payload)
            frame.append(0x80 | length)

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
            print("[WS] Pong Error:", e)

    async def read_exactly(self, n, timeout_sec=30):
        data = b""
        try:
            while len(data) < n:
                chunk = await asyncio.wait_for(
                    self.reader.read(n - len(data)),
                    timeout=timeout_sec,
                )
                if not chunk:
                    raise OSError("Connection closed during read")
                data += chunk
        except asyncio.TimeoutError:
            raise OSError("Read timeout")
        return data

    async def recv(self):
        if not self.open:
            return None
        try:
            data = await self.read_exactly(1)
            byte1 = data[0]
            opcode = byte1 & 0x0F

            if opcode == 0x8:
                data = await self.read_exactly(1)
                byte2 = data[0]
                length = byte2 & 0x7F
                if length > 0:
                    await self.read_exactly(length)
                print("[WS] Server sent Close Frame")
                self.close()
                return None

            if opcode == 0x9:
                data = await self.read_exactly(1)
                byte2 = data[0]
                length = byte2 & 0x7F
                payload = b""
                if length > 0:
                    payload = await self.read_exactly(length)
                await self._send_pong(payload)
                return None

            if opcode == 0xA:
                data = await self.read_exactly(1)
                byte2 = data[0]
                length = byte2 & 0x7F
                if length > 0:
                    await self.read_exactly(length)
                return None

            data = await self.read_exactly(1)
            byte2 = data[0]
            length = byte2 & 0x7F

            if length == 126:
                data = await self.read_exactly(2)
                length = int.from_bytes(data, "big")
            elif length == 127:
                data = await self.read_exactly(8)
                length = int.from_bytes(data, "big")

            if length > 0:
                payload = await self.read_exactly(length)
                try:
                    return payload.decode("utf-8")
                except Exception as e:
                    print("[WS] Payload decode error:", e)
                    return None
            return ""
        except Exception as e:
            print("[WS] Recv Error:", e)
            self.close()
            return None

    def close(self):
        self.open = False
        if self.writer:
            try:
                self.writer.close()
            except Exception as e:
                print("[WS] Close cleanup error:", e)
        self.writer = None
        self.reader = None


# ==========================================
# 3. HARDWARE MANAGERS
# ==========================================
class HardwareManager:
    def __init__(self):
        self.relay = machine.Pin(PERIPHERALS["RELAY"], machine.Pin.OUT)
        self.relay.value(0)

        self.buzzer = PWM(Pin(PERIPHERALS["BUZZER"]))
        self.buzzer.duty_u16(0)

        self.adc = machine.ADC(machine.Pin(PERIPHERALS["TEMP_ADC"]))
        self.adc.atten(machine.ADC.ATTN_11DB)

        try:
            rst = Pin(RST_PIN, Pin.OUT)
            rst.off()
            time.sleep(0.05)
            rst.on()
            time.sleep(0.05)

            spi = SPI(
                1,
                baudrate=2500000,
                polarity=0,
                phase=0,
                sck=Pin(SCK_PIN),
                mosi=Pin(MOSI_PIN),
                miso=Pin(MISO_PIN),
            )
            self.rdr = MFRC522(spi=spi, cs=Pin(CS_PIN, Pin.OUT))
            print("[HW] RFID Initialized")
        except Exception as e:
            print("[HW] RFID Init Error:", e)
            self.rdr = None

    def read_temp(self):
        try:
            samples = [self.adc.read() for _ in range(10)]
            avg_reading = sum(samples) / len(samples)
            voltage = (avg_reading / 4095.0) * VREF
            temp_k = voltage * 100
            temp_c = temp_k - 273.15
            return round(temp_c, 1)
        except Exception as e:
            print("[HW] Temp read error:", e)
            return 0.0

    async def _sound(self, freq, duration_sec):
        if freq < 50:
            freq = 50
        self.buzzer.freq(int(freq))
        self.buzzer.duty_u16(32768)
        await asyncio.sleep(duration_sec)

    async def _silence(self, duration_sec):
        self.buzzer.duty_u16(0)
        await asyncio.sleep(duration_sec)

    async def play_key_beep(self):
        await self._sound(880, 0.04)
        await self._silence(0.02)

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

    async def open_door(self, duration=3, silent=False):
        if not RUNTIME.unlock_enabled:
            print("[HW] OPEN blocked (unlock disabled)")
            return
        if getattr(self, "_door_busy", False):
            print("[HW] OPEN ignored (door already opening)")
            return
        try:
            duration = max(1, min(60, int(duration)))
        except (TypeError, ValueError):
            duration = 3
        self._door_busy = True
        try:
            print("[HW] Opening Door for {}s...".format(duration))
            if not silent:
                asyncio.create_task(self.play_success())
            self.relay.value(1)
            await asyncio.sleep(duration)
            self.relay.value(0)
        finally:
            self._door_busy = False

    async def access_denied(self):
        if not RUNTIME.unlock_enabled:
            return
        print("[HW] Access Denied")
        await self.play_error()


# ==========================================
# 4. SHARED RUNTIME STATE
# ==========================================
class RuntimeState:
    def __init__(self):
        self.clock = ntp_time.NtpClock()
        self.store = allowlist.AllowlistStore(clock=self.clock)
        self.events = allowlist.EventQueue()
        self.invalidate_allowlist = False
        self.unlock_enabled = True
        self.flushing_events = False
        self.keypad = keypad_mod.Keypad() if KEYPAD_ENABLED else None


RUNTIME = RuntimeState()


def queue_access_event(ev_type, rfid=None, action=None, is_duress=False, temperature=None,
                       pin_hash=None, user_name=None, channel=None, event_id=None):
    ev = {
        "event_id": event_id or "{}-{}".format(int(time.time()), random.getrandbits(32)),
        "type": ev_type,
    }
    if rfid is not None:
        ev["rfid"] = rfid
    if channel is not None:
        ev["channel"] = channel
    if action is not None:
        ev["action"] = action
    if user_name is not None:
        ev["user_name"] = user_name
    ev["is_duress"] = bool(is_duress)
    if temperature is not None:
        ev["temperature"] = temperature
    if pin_hash is not None:
        ev["pin_hash"] = pin_hash
    RUNTIME.events.push(ev)
    return ev


async def sync_allowlist():
    payload = allowlist.fetch_allowlist(
        SERVER_HOST, SERVER_PORT, USE_SSL, HARDWARE_TOKEN)
    if payload:
        RUNTIME.store.apply_payload(payload)
        print("[AL] synced etag:", payload.get("etag", "?"))
        return True
    return False


async def allowlist_sync_loop():
    RUNTIME.store.load_file()
    await asyncio.sleep(2)
    while RUNTIME.unlock_enabled:
        if RUNTIME.invalidate_allowlist:
            RUNTIME.invalidate_allowlist = False
            await sync_allowlist()
        elif not RUNTIME.store.data:
            await sync_allowlist()
        await asyncio.sleep(300)


async def ntp_sync_loop():
    while RUNTIME.unlock_enabled:
        sta = network.WLAN(network.STA_IF)
        if sta.isconnected():
            RUNTIME.clock.maybe_resync()
        await asyncio.sleep(600)


async def flush_events_now():
    if RUNTIME.flushing_events:
        return False
    RUNTIME.flushing_events = True
    try:
        sta = network.WLAN(network.STA_IF)
        if not sta.isconnected():
            return False
        batch = RUNTIME.events.drain()
        if not batch:
            return True
        ok = allowlist.post_events(
            SERVER_HOST, SERVER_PORT, USE_SSL, HARDWARE_TOKEN, batch)
        if not ok:
            RUNTIME.events.prepend_batch(batch)
        return ok
    except Exception as e:
        print("[EV] flush error:", e)
        return False
    finally:
        RUNTIME.flushing_events = False


async def event_flush_loop():
    while RUNTIME.unlock_enabled:
        await flush_events_now()
        await asyncio.sleep(15)


async def handle_rfid_scan(hw, ws, uid_str):
    temp = hw.read_temp()
    result = RUNTIME.store.evaluate_rfid(uid_str)

    if result.get("needs_pin"):
        await hw.play_key_beep()
        print("[RFID] Awaiting PIN within 10s for", uid_str)
        return

    granted = bool(result.get("granted"))
    is_duress = bool(result.get("is_duress", False))
    decision = "GRANTED" if granted else "DENIED"

    if granted:
        await hw.open_door(duration=RUNTIME.store.unlock_duration(), silent=is_duress)
    else:
        await hw.access_denied()

    ws_sent = False
    if ws and ws.open:
        try:
            payload = json.dumps({
                "type": "scan",
                "rfid": uid_str,
                "temperature": temp,
                "is_duress": is_duress,
                "local_decision": decision,
            }).encode()
            res = await ws.send(payload)
            ws_sent = bool(ws.open) if res is None else bool(res)
        except Exception as e:
            print("[RFID] WS notify error:", e)
            ws_sent = False

    if not ws_sent:
        queue_access_event(
            decision,
            rfid=uid_str,
            channel="RFID",
            action=decision,
            is_duress=is_duress,
            temperature=temp,
            user_name=result.get("user_name") or ("User" if granted else "Unknown"),
        )


async def handle_pin_submit(hw, pin_digits):
    temp = hw.read_temp()
    result = RUNTIME.store.evaluate_pin(pin_digits)
    ev_type = result.get("event_type", "PIN_DENIED")

    if result.get("granted"):
        is_duress = bool(result.get("is_duress", False))
        await hw.open_door(duration=RUNTIME.store.unlock_duration(), silent=is_duress)
        if ev_type == "TEMP_PIN_USED":
            queue_access_event(
                "TEMP_PIN_USED",
                rfid="TEMP_PIN",
                channel="TEMP_PIN",
                action="GRANTED",
                is_duress=False,
                pin_hash=result.get("pin_hash"),
                temperature=temp,
                user_name=result.get("user_name"),
            )
        else:
            queue_access_event(
                "GRANTED",
                rfid=result.get("rfid") or "PIN",
                channel="PIN",
                action="GRANTED",
                is_duress=is_duress,
                temperature=temp,
                user_name=result.get("user_name"),
            )
    else:
        await hw.access_denied()
        queue_access_event(
            "PIN_DENIED",
            rfid="PIN",
            channel="PIN",
            action="PIN_DENIED",
            is_duress=False,
            temperature=temp,
        )

    try:
        sta = network.WLAN(network.STA_IF)
        if sta.isconnected():
            asyncio.create_task(flush_events_now())
    except Exception as e:
        print("[PIN] flush schedule error:", e)


def _ticks_ms():
    if hasattr(time, "ticks_ms"):
        return time.ticks_ms()
    return int(time.monotonic() * 1000)


async def keypad_loop(hw):
    if not RUNTIME.keypad:
        return
    while RUNTIME.unlock_enabled:
        now_ms = _ticks_ms()
        event = RUNTIME.keypad.poll(now_ms)
        if event:
            if event[0] == "digit":
                await hw.play_key_beep()
            elif event[0] == "clear":
                await hw.play_key_beep()
            elif event[0] == "submit":
                pin = event[1]
                if pin:
                    await handle_pin_submit(hw, pin)
                else:
                    await hw.play_key_beep()
        await asyncio.sleep(0.05)


# ==========================================
# 5. MAIN ASYNC LOGIC
# ==========================================
async def ws_receiver(ws, hw):
    while True:
        if ws.open:
            msg = await ws.recv()
            if msg:
                print("[WS] Rx:", msg)
                try:
                    data = json.loads(msg)
                    cmd = data.get("cmd")
                    if cmd == "OPEN":
                        if RUNTIME.unlock_enabled:
                            duration = data.get("duration") or RUNTIME.store.unlock_duration()
                            asyncio.create_task(hw.open_door(duration))
                    elif cmd == "DENY":
                        if RUNTIME.unlock_enabled:
                            asyncio.create_task(hw.access_denied())
                    elif cmd == "ALLOWLIST_INVALIDATE":
                        RUNTIME.invalidate_allowlist = True
                        print("[WS] Allowlist invalidate requested")
                    elif cmd == "PONG":
                        pass
                except Exception as e:
                    print("[WS] JSON Parse Error:", e, "| Raw:", msg)
        await asyncio.sleep(0.05)


async def telemetry_sender(ws, hw):
    while True:
        if ws.open and RUNTIME.unlock_enabled:
            try:
                temp = hw.read_temp()
                msg = json.dumps({
                    "type": "telemetry",
                    "temperature": temp,
                }).encode()
                await ws.send(msg)
            except Exception as e:
                print("[TEL] Error sending telemetry:", e)
        await asyncio.sleep(30)


async def ping_sender(ws):
    while True:
        if ws.open:
            try:
                msg = json.dumps({"type": "ping"}).encode()
                await ws.send(msg)
            except Exception as e:
                print("[WS] Ping error:", e)
        await asyncio.sleep(15)


async def enter_softap_mode(wdt=None):
    RUNTIME.unlock_enabled = False
    ap = softap.SoftAPMode(SOFTAP_SSID, SOFTAP_PASS)
    if ap.start():
        await ap.run_loop(wdt=wdt)
    else:
        print("[AP] SoftAP start cancelled — rebooting")
        machine.reset()


async def system_runner():
    print("[SYS] Initializing Watchdog (15s)...")
    try:
        wdt = WDT(timeout=15000)
    except Exception as e:
        print("[SYS] WDT unavailable:", e)
        wdt = None

    if softap.provision_button_held(wdt=wdt):
        print("[SYS] Provision GPIO33 held — entering SoftAP")
        await enter_softap_mode(wdt=wdt)
        return

    hw = HardwareManager()
    print("[SYS] Target WebSocket:", WS_URL)
    ws = AsyncWSClient(WS_URL)

    RUNTIME.store.load_file()
    await hw.play_startup()

    asyncio.create_task(ws_receiver(ws, hw))
    asyncio.create_task(telemetry_sender(ws, hw))
    asyncio.create_task(ping_sender(ws))
    asyncio.create_task(allowlist_sync_loop())
    asyncio.create_task(ntp_sync_loop())
    asyncio.create_task(event_flush_loop())
    asyncio.create_task(keypad_loop(hw))

    wifi_fail_streak = 0
    print("[SYS] System Runner Started (local-first unlock).")

    while True:
        if wdt:
            wdt.feed()

        if not RUNTIME.unlock_enabled:
            await asyncio.sleep(1)
            continue

        sta = network.WLAN(network.STA_IF)
        if not sta.isconnected():
            print("[NET] WiFi Down. Reconnecting to", WIFI_SSID, "...")
            sta.active(True)
            sta.connect(WIFI_SSID, WIFI_PASS)

            for _ in range(20):
                if wdt:
                    wdt.feed()
                if sta.isconnected():
                    break
                await asyncio.sleep(0.5)

            if not sta.isconnected():
                wifi_fail_streak += 1
                print("[NET] WiFi fail streak:", wifi_fail_streak)
                if wifi_fail_streak >= 5:
                    print("[SYS] 5 WiFi failures — entering SoftAP")
                    await enter_softap_mode(wdt=wdt)
                    return
            else:
                wifi_fail_streak = 0
                print("[NET] Reconnected! IP:", sta.ifconfig()[0])
                RUNTIME.clock.sync()
                asyncio.create_task(sync_allowlist())
        else:
            wifi_fail_streak = 0

            if not ws.open:
                print("[WS] Connecting...")
                if await ws.connect():
                    await hw.play_success()
                else:
                    await asyncio.sleep(5)

            if hw.rdr:
                try:
                    stat, tag_type = hw.rdr.request(hw.rdr.REQIDL)
                    if stat == hw.rdr.OK:
                        stat, uid = hw.rdr.anticoll()
                        if stat == hw.rdr.OK:
                            uid_str = "0x%02x%02x%02x%02x" % (
                                uid[0], uid[1], uid[2], uid[3])
                            print("[RFID] Scanned:", uid_str)
                            await handle_rfid_scan(hw, ws, uid_str)
                            await asyncio.sleep(1.5)
                except Exception as e:
                    print("[RFID] Err:", e)

        gc.collect()
        await asyncio.sleep(0.1)


if __name__ == "__main__":
    try:
        asyncio.run(system_runner())
    except KeyboardInterrupt:
        print("Stopped")
    except Exception as e:
        print("Critical Error:", e)
        machine.reset()
