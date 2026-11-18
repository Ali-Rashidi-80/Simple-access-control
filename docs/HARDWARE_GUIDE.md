# SentryGate Door — Hardware Guide

## Bill of materials

| Part | Qty | Notes |
|------|:---:|-------|
| ESP32 DevKit | 1 | Wi‑Fi; 3.3 V logic |
| RC522 RFID (SPI) | 1 | MIFARE UID reader |
| Relay module | 1 | Active-high, 3.3 V coil driver |
| Passive buzzer | 1 | PWM melodies |
| LM35 / LM335 (optional) | 1 | Ambient temp on ADC |
| Electric lock | 1 | 12 V solenoid or magnetic |
| 12 V PSU + buck | 1 | Isolate lock noise from ESP32 |

---

## GPIO pinout (matches `micro-python-esp32/main.py`)

### RC522 (SPI)

| RC522 | ESP32 GPIO |
|-------|------------|
| RST | **4** |
| SDA / SS | **5** |
| SCK | **18** |
| MISO | **19** |
| MOSI | **23** |
| 3.3 V / GND | 3.3 V / GND |

### Peripherals

| Function | GPIO | Notes |
|----------|------|-------|
| Relay | **15** | HIGH = energized |
| Buzzer (PWM) | **17** | Passive buzzer only |
| Temp sensor | **34** | ADC input only |

### 4×3 keypad (matrix)

| Rows (OUT) | **13**, **14**, **16**, **27** |
| Cols (IN, pull-up) | **25**, **26**, **32** |

Layout: `1 2 3` / `4 5 6` / `7 8 9` / `* 0 #` — `#` submits PIN, `*` clears.

### Provision button

| Function | GPIO |
|----------|------|
| SoftAP trigger | **33** | Hold LOW ≥3 s at boot → SoftAP setup mode |

---

## Forbidden GPIOs

Do **not** use these for wiring — boot/strapping pins on ESP32:

| GPIO | Reason |
|------|--------|
| **0** | Boot mode strap |
| **2** | Boot / onboard LED on many boards |
| **12** | Flash voltage strap |

---

## Assembly tips

- Flyback diode (1N4007) across lock coil — prevents ESP32 resets from inductive kickback.
- Power ESP32 from a buck converter; do not feed 12 V to 3.3 V pins.
- RC522 is **3.3 V only** — do not connect 5 V logic.
- Copy `config.example.json` → `config.json`; set `hardware_token` to match server `HARDWARE_TOKEN`.

---

## Firmware files

| File | Purpose |
|------|---------|
| `main.py` | Boot, WebSocket, RFID, relay, buzzer |
| `keypad.py` | Matrix scan |
| `allowlist.py` | Offline access decisions |
| `pin_hmac.py` | PIN HMAC verify (no `hmac` module) |
| `softap.py` | GPIO 33 provision portal |
| `config.json` | Wi‑Fi, server, token (**gitignored**) |
