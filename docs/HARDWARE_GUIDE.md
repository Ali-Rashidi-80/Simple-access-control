# 🛠️ SentryGate Hardware Assembly & Wiring Specification

**[English](HARDWARE_GUIDE.md)** • **[فارسی](HARDWARE_GUIDE.fa.md)**

This guide provides complete electrical, schematic, and physical assembly instructions for the SentryGate edge hardware node.

---

## 1. Bill of Materials (BOM)

| Component | Technical Specification | Qty | Function & Notes |
| :--- | :--- | :---: | :--- |
| **ESP32 NodeMCU** | ESP-WROOM-32 (240MHz, 4MB Flash, Wi-Fi 802.11 b/g/n) | 1 | Master edge microcontroller running MicroPython |
| **RC522 RFID Module** | 13.56 MHz, SPI Bus, Mifare Classic 1K / S50 | 1 | Contactless badge reader |
| **Relay Module** | 1-Channel 5V/3.3V Optocoupler Isolated | 1 | Controls high-current 12V electric lock strike |
| **Passive Buzzer** | Piezoelectric Transducer (requires PWM square wave) | 1 | Acoustic feedback for granted/denied events |
| **DS18B20 Sensor** | 1-Wire Digital Temperature Sensor (TO-92 package) | 1 | Environmental & enclosure thermal monitoring |
| **Flyback Diode** | 1N4007 (1000V Peak Reverse Voltage, 1A Continuous) | 1 | Inductive kickback suppression across lock coil |
| **Pull-Up Resistor** | 4.7kΩ 1/4W Resistor | 1 | 1-Wire bus pull-up for DS18B20 data line |
| **Power Supply** | 12V DC 2A Regulated Adapter + 5V Step-Down Buck Converter | 1 | Dual-rail clean power delivery |

---

## 2. Complete Wiring & Pinout Matrix

### 2.1 RC522 RFID Reader to ESP32 (SPI Interface)

| RC522 Pin | ESP32 GPIO | Logic Level | Wire Color Recommendation | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SDA (NSS / CS)** | GPIO **5** | 3.3V Logic | Yellow | SPI Slave Select |
| **SCK** | GPIO **18** | 3.3V Logic | Green | SPI Serial Clock |
| **MOSI** | GPIO **23** | 3.3V Logic | Blue | Master Out Slave In |
| **MISO** | GPIO **19** | 3.3V Logic | Violet | Master In Slave Out |
| **RST** | GPIO **4** | 3.3V Logic | Orange | Hardware Reset Line |
| **GND** | **GND** | 0V | Black | Common Signal Ground |
| **3.3V** | **3V3** | 3.3V DC | Red | Regulated 3.3V Power Line |

> [!CAUTION]
> **Voltage Restriction:** NEVER connect the RC522 VCC pin to 5V. The MFRC522 IC is strictly a 3.3V device. Supplying 5V will permanently burn out the RFID chip.

---

### 2.2 Peripherals: Relay, Buzzer & Temperature Sensor

| Peripheral | Component Pin | ESP32 GPIO | Functionality |
| :--- | :--- | :--- | :--- |
| **Relay Module** | **IN (Signal)** | GPIO **16** | Active HIGH triggers lock release |
| **Relay Module** | **VCC** | **VIN (5V)** | Power for relay coil and optocoupler |
| **Relay Module** | **GND** | **GND** | Common ground reference |
| **Passive Buzzer** | **+ (Signal)** | GPIO **17** | Frequency modulation via PWM |
| **Passive Buzzer** | **- (GND)** | **GND** | Ground reference |
| **DS18B20** | **Data (DQ)** | GPIO **34** | 1-Wire digital temperature bus |
| **DS18B20** | **VCC** | **3V3** | 3.3V power |
| **DS18B20** | **GND** | **GND** | Ground reference |

---

## 3. High-Voltage & Inductive Load Circuit Diagram

```
                 +12V DC Power Supply
                     |
                     +----------------------------+
                     |                            |
                     |                      +-----------+
                     |                      | 12V Lock  |
                     |                      | Solenoid  |
                     |                      +-----------+
                     |                            |
                     |                      [Cathode - Band]
                     |                            |
                     |                   Diode: 1N4007 (Reverse Bias)
                     |                            |
                     |                      [Anode]
                     |                            |
          Relay (COM)+                            |
                     \   (Normally Open)          |
          Relay (NO)  +---------------------------+
                     |
                    GND (Power Supply)
```

---

## 4. Engineering Assembly Directives

### 4.1 Flyback Diode Installation (Critical)
When the relay opens, the magnetic field in the 12V solenoid collapses abruptly, inducing a high-voltage back-EMF spike (often exceeding -200V).
- Connect the **1N4007 diode directly across the lock terminals**.
- The diode **cathode** (marked with the silver/white band) MUST connect to the **+12V terminal**.
- The diode **anode** connects to the ground/switched relay terminal.
- Omitting this diode will cause spontaneous ESP32 brownout resets during door unlock events.

### 4.2 Power Rail Isolation
Never power the 12V lock solenoid and the ESP32 logic from a shared unregulated single rail without decoupling. High inrush current drawn by the solenoid (typically 1.5A to 2.5A during pull-in) causes momentary voltage drops that trip the ESP32's internal Brownout Detector (BOD).
- Use a dedicated 12V supply.
- Step down 12V to 5V using a high-efficiency DC-DC Buck Converter (e.g. LM2596 or MP1584) to feed the ESP32's `VIN` pin.
- Place a 470µF electrolytic capacitor across the 5V rail near the ESP32 for transient smoothing.

### 4.3 Passive Buzzer vs. Active Buzzer
SentryGate utilizes frequency-modulated tones (e.g. C5: 523Hz, E5: 659Hz, G5: 784Hz) for intuitive auditory feedback:
- Ensure your buzzer is **Passive** (transducer type).
- An Active buzzer contains an internal fixed-frequency oscillator and can only emit a monotone beep when energized, failing to play feedback melodies.
