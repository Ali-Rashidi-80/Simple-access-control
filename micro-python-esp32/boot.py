# boot.py
try:
    import usocket as socket
except ImportError:
    import socket

import json
import network
import machine
import time

def load_boot_config():
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except (OSError, ValueError) as err:
        print(f"[BOOT] Notice: Could not read config.json: {err}")
        return {}

def do_connect():
    cfg = load_boot_config()
    ssid = cfg.get("wifi_ssid", "")
    password = cfg.get("wifi_pass", "")

    if not ssid:
        print("[BOOT] Warning: No wifi_ssid specified in config.json. Skipping auto-connect.")
        return

    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print(f"[BOOT] Connecting to network '{ssid}'...")
        wlan.connect(ssid, password)
        # Wait for connection with timeout
        max_wait = 20
        while max_wait > 0:
            if wlan.status() < 0 or wlan.status() >= 3:
                break
            max_wait -= 1
            print('[BOOT] Waiting for connection...')
            time.sleep(1)

    if wlan.isconnected():
        print('[BOOT] Network config:', wlan.ifconfig())
    else:
        print('[BOOT] WiFi connection failed or timed out')

do_connect()
