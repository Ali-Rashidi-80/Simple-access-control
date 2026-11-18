"""SoftAP exclusive provision mode (GPIO33 hold or WiFi fail streak)."""
import gc
import json
import random
import time

import machine
from machine import Pin

try:
    import uasyncio as asyncio
except ImportError:
    import asyncio

PROVISION_GPIO = 33
PROVISION_HOLD_MS = 3000
MIN_FREE_BYTES = 32 * 1024
CONFIG_FILE = "config.json"
MAX_HTTP_BODY = 4096


def _ticks_ms():
    if hasattr(time, "ticks_ms"):
        return time.ticks_ms()
    return int(time.monotonic() * 1000)


def _ticks_diff(a, b):
    if hasattr(time, "ticks_diff"):
        return time.ticks_diff(a, b)
    return a - b


def _sleep_ms(ms):
    if hasattr(time, "sleep_ms"):
        time.sleep_ms(ms)
    else:
        time.sleep(ms / 1000.0)


def _generate_setup_password():
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    out = []
    try:
        import os

        raw = os.urandom(10)
        for b in raw:
            out.append(chars[b % len(chars)])
    except Exception:
        for _ in range(10):
            out.append(chars[random.getrandbits(5) % len(chars)])
    return "SG-" + "".join(out)


def _is_weak_or_placeholder(password):
    if not password or not isinstance(password, str):
        return True
    p = password.strip()
    if len(p) < 8:
        return True
    low = p.lower()
    if low.startswith("change-me") or low.startswith("change_me"):
        return True
    if low == ("setup" + "12345") or low in ("password", "12345678", "admin123"):
        return True
    return False


def _html_escape(val):
    s = str(val or "")
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _urldecode(raw):
    raw = raw.replace("+", " ")
    parts = raw.split("%")
    out = bytearray(parts[0].encode("utf-8"))
    for part in parts[1:]:
        if len(part) >= 2:
            try:
                out.append(int(part[:2], 16))
                out.extend(part[2:].encode("utf-8"))
                continue
            except ValueError:
                pass
        out.extend(("%" + part).encode("utf-8"))
    try:
        return bytes(out).decode("utf-8")
    except Exception:
        return "".join(chr(b) if b < 128 else "?" for b in out)


def _parse_form(body_str):
    out = {}
    for pair in body_str.split("&"):
        if not pair:
            continue
        if "=" in pair:
            k, v = pair.split("=", 1)
            out[_urldecode(k)] = _urldecode(v)
        else:
            out[_urldecode(pair)] = ""
    return out


def _parse_bool(val, default=True):
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    if s in ("true", "1", "yes", "on"):
        return True
    if s in ("false", "0", "no", "off"):
        return False
    return default


def provision_button_held(wdt=None):
    """True if GPIO33 held low for >=3s at boot."""
    try:
        btn = Pin(PROVISION_GPIO, Pin.IN, Pin.PULL_UP)
        if btn.value() != 0:
            return False
        start = _ticks_ms()
        while btn.value() == 0:
            if wdt is not None:
                wdt.feed()
            if _ticks_diff(_ticks_ms(), start) >= PROVISION_HOLD_MS:
                return True
            _sleep_ms(50)
        return False
    except Exception as e:
        print("[AP] provision GPIO error:", e)
        return False


def can_enter_softap():
    free = gc.mem_free() if hasattr(gc, "mem_free") else MIN_FREE_BYTES
    if free < MIN_FREE_BYTES:
        print("[AP] cancelled: low memory", free)
        return False
    return True


class SoftAPMode:
    def __init__(self, ssid=None, password=None):
        self.ssid = (ssid or "").strip() or "SentryGate-Setup"
        if _is_weak_or_placeholder(password):
            self.password = _generate_setup_password()
            self._generated_password = True
        else:
            self.password = password.strip()
            self._generated_password = False
        self.active = False
        self._ap = None

    def start(self):
        if not can_enter_softap():
            return False
        try:
            import network

            ap = network.WLAN(network.AP_IF)
            ap.active(True)
            ap.config(essid=self.ssid, password=self.password, authmode=3)
            self._ap = ap
            self.active = True
            cfg = ap.ifconfig()
            print("[AP] SoftAP active:", self.ssid, cfg)
            if self._generated_password:
                print("[AP] One-time setup password:", self.password)
            return True
        except Exception as e:
            print("[AP] start failed:", e)
            self.active = False
            return False

    def stop(self):
        self.active = False
        if self._ap:
            try:
                self._ap.active(False)
            except Exception as e:
                print("[AP] stop cleanup:", e)
        self._ap = None

    def _load_existing_config(self):
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def validate_and_save_config(self, fields):
        """Validate submitted provisioning fields and persist config.json."""
        if not isinstance(fields, dict):
            return False, "Invalid request payload"

        wifi_ssid = str(fields.get("wifi_ssid") or "").strip()
        wifi_pass = str(fields.get("wifi_pass") or "")
        server_host = str(fields.get("server_host") or "").strip()
        hardware_token = str(fields.get("hardware_token") or "").strip()

        if not wifi_ssid or len(wifi_ssid) > 64:
            return False, "wifi_ssid must be 1..64 characters"
        if len(wifi_pass) > 64:
            return False, "wifi_pass exceeds 64 characters"
        if not server_host or len(server_host) > 253:
            return False, "server_host is required"
        if " " in server_host or "/" in server_host or ":" in server_host:
            return False, "server_host must be hostname or IP only"
        if not hardware_token or len(hardware_token) > 256:
            return False, "hardware_token is required"

        raw_port = fields.get("server_port")
        try:
            server_port = int(443 if raw_port in (None, "") else raw_port)
        except (TypeError, ValueError):
            return False, "server_port must be an integer"
        if server_port < 1 or server_port > 65535:
            return False, "server_port must be between 1 and 65535"

        use_ssl = _parse_bool(fields.get("use_ssl"), default=True)
        keypad_enabled = _parse_bool(fields.get("keypad_enabled"), default=True)

        cfg = self._load_existing_config()
        cfg.setdefault("ws_path", "/ws/hardware")
        cfg.setdefault("device_role", "door")
        cfg.setdefault("softap_ssid", self.ssid)
        cfg["wifi_ssid"] = wifi_ssid
        cfg["wifi_pass"] = wifi_pass
        cfg["server_host"] = server_host
        cfg["server_port"] = server_port
        cfg["use_ssl"] = use_ssl
        cfg["hardware_token"] = hardware_token
        cfg["keypad_enabled"] = keypad_enabled

        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(cfg, f)
        except Exception as e:
            return False, "Failed to write config: {}".format(e)

        return True, cfg

    def render_portal_html(self, error_msg=None, values=None):
        existing = self._load_existing_config()
        vals = values if isinstance(values, dict) else {}
        ssid_val = _html_escape(vals.get("wifi_ssid", existing.get("wifi_ssid", "")))
        host_val = _html_escape(vals.get("server_host", existing.get("server_host", "")))
        port_val = _html_escape(vals.get("server_port", existing.get("server_port", 443)))
        use_ssl = _parse_bool(vals.get("use_ssl", existing.get("use_ssl")), default=True)
        keypad_on = _parse_bool(
            vals.get("keypad_enabled", existing.get("keypad_enabled")), default=True
        )
        err_html = (
            '<div class="err">{}</div>'.format(_html_escape(error_msg))
            if error_msg
            else ""
        )
        ssl_yes = " selected" if use_ssl else ""
        ssl_no = "" if use_ssl else " selected"
        kp_yes = " selected" if keypad_on else ""
        kp_no = "" if keypad_on else " selected"

        return (
            "<!DOCTYPE html><html><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<title>SentryGate Setup</title><style>"
            "body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:16px}"
            ".card{max-width:420px;margin:20px auto;background:#1e293b;"
            "padding:20px;border-radius:10px}"
            "h1{font-size:18px;margin:0 0 12px}"
            "label{display:block;font-size:13px;margin:10px 0 4px}"
            "input,select,button{width:100%;box-sizing:border-box;padding:9px;border-radius:6px;"
            "border:1px solid #334155;background:#0f172a;color:#f8fafc}"
            "button{margin-top:16px;background:#0ea5e9;border:0;font-weight:bold;cursor:pointer}"
            ".err{background:#7f1d1d;color:#fecaca;padding:8px;border-radius:6px;margin-bottom:10px}"
            "</style></head><body><div class='card'><h1>SentryGate Door Provisioning</h1>"
            + err_html
            + "<form method='POST' action='/save'>"
            "<label>WiFi SSID</label><input name='wifi_ssid' required value='"
            + ssid_val
            + "'>"
            "<label>WiFi Password</label>"
            "<input type='password' name='wifi_pass' placeholder='WiFi password'>"
            "<label>Server Host</label>"
            "<input name='server_host' required placeholder='example.com' value='"
            + host_val
            + "'>"
            "<label>Server Port</label>"
            "<input type='number' min='1' max='65535' name='server_port' value='"
            + port_val
            + "'>"
            "<label>Use SSL (HTTPS/WSS)</label><select name='use_ssl'>"
            "<option value='true'" + ssl_yes + ">Enabled</option>"
            "<option value='false'" + ssl_no + ">Disabled</option></select>"
            "<label>Hardware Token</label>"
            "<input type='password' name='hardware_token' required placeholder='Device token'>"
            "<label>Keypad Enabled</label><select name='keypad_enabled'>"
            "<option value='true'" + kp_yes + ">Enabled</option>"
            "<option value='false'" + kp_no + ">Disabled</option></select>"
            "<button type='submit'>Save &amp; Reboot</button></form></div></body></html>"
        )

    async def _send_http(self, writer, status_line, content_type, body_text):
        body_bytes = body_text.encode("utf-8") if isinstance(body_text, str) else body_text
        headers = (
            "HTTP/1.1 {}\r\n"
            "Content-Type: {}\r\n"
            "Content-Length: {}\r\n"
            "Connection: close\r\n"
            "Cache-Control: no-store\r\n\r\n"
        ).format(status_line, content_type, len(body_bytes))
        writer.write(headers.encode("ascii") + body_bytes)
        await writer.drain()

    async def _handle_http_client(self, reader, writer):
        should_reboot = False
        try:
            req_line = await asyncio.wait_for(reader.readline(), 5)
            if not req_line:
                return
            parts = req_line.decode("utf-8").strip().split()
            if len(parts) < 2:
                await self._send_http(writer, "400 Bad Request", "text/plain", "Bad Request")
                return
            method = parts[0].upper()
            path = parts[1].split("?", 1)[0]

            content_length = 0
            content_type = ""
            while True:
                line = await asyncio.wait_for(reader.readline(), 5)
                if not line or line in (b"\r\n", b"\n"):
                    break
                text = line.decode("utf-8").strip()
                low = text.lower()
                if low.startswith("content-length:"):
                    try:
                        content_length = int(text.split(":", 1)[1].strip())
                    except ValueError:
                        content_length = -1
                elif low.startswith("content-type:"):
                    content_type = text.split(":", 1)[1].strip().lower()

            if method == "POST" and path == "/save":
                if content_length < 0 or content_length > MAX_HTTP_BODY:
                    await self._send_http(
                        writer, "400 Bad Request", "text/plain", "Invalid body length"
                    )
                    return
                body = b""
                while len(body) < content_length:
                    chunk = await asyncio.wait_for(
                        reader.read(content_length - len(body)), 5
                    )
                    if not chunk:
                        break
                    body += chunk
                raw_text = body.decode("utf-8")
                if "application/json" in content_type or raw_text.lstrip().startswith("{"):
                    try:
                        fields = json.loads(raw_text)
                    except Exception:
                        fields = None
                else:
                    fields = _parse_form(raw_text)

                ok, res = self.validate_and_save_config(fields)
                if not ok:
                    html = self.render_portal_html(error_msg=res, values=fields)
                    await self._send_http(
                        writer, "400 Bad Request", "text/html; charset=utf-8", html
                    )
                    return

                done_html = (
                    "<!DOCTYPE html><html><head><meta charset='utf-8'>"
                    "<title>Saved</title></head><body style='font-family:sans-serif;"
                    "background:#0f172a;color:#e2e8f0;padding:24px'>"
                    "<h2>Configuration saved</h2><p>Device is rebooting...</p></body></html>"
                )
                await self._send_http(
                    writer, "200 OK", "text/html; charset=utf-8", done_html
                )
                should_reboot = True
                return

            if method == "GET":
                html = self.render_portal_html()
                await self._send_http(
                    writer, "200 OK", "text/html; charset=utf-8", html
                )
                return

            await self._send_http(writer, "404 Not Found", "text/plain", "Not Found")
        except Exception as e:
            print("[AP] HTTP request error:", e)
        finally:
            try:
                writer.close()
                if hasattr(writer, "wait_closed"):
                    await writer.wait_closed()
            except Exception as e:
                print("[AP] HTTP close:", e)
            if should_reboot:
                self.stop()
                await asyncio.sleep(0.2)
                machine.reset()

    async def run_loop(self, wdt=None, host="0.0.0.0", port=80):
        """Block in provision mode — feed WDT and serve captive portal; unlock disabled."""
        print("[AP] Provision mode — unlock disabled")
        server = None
        try:
            server = await asyncio.start_server(self._handle_http_client, host, port)
            print("[AP] Captive portal listening on {}:{}".format(host, port))
        except Exception as e:
            print("[AP] HTTP server start failed:", e)

        try:
            while self.active:
                if wdt is not None:
                    wdt.feed()
                await asyncio.sleep(0.5)
        finally:
            if server is not None:
                try:
                    server.close()
                    if hasattr(server, "wait_closed"):
                        await server.wait_closed()
                except Exception as e:
                    print("[AP] HTTP server close:", e)
