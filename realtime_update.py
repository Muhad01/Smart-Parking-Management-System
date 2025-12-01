import os
import serial
import serial.tools.list_ports
import json
import time


# --- Load full website parking data so data.json always contains everything ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARKINGDATA_PATH = os.path.join(BASE_DIR, "..", "parkingdata.json")
DATA_PATH = os.path.join(BASE_DIR, "data.json")

with open(PARKINGDATA_PATH, "r") as f:
    full_state = json.load(f)


def find_arduino_port():
    """Automatically find the Arduino COM port."""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "CH340" in port.description or "USB-SERIAL" in port.description:
            return port.device
    return None

print("Searching for Arduino...")

PORT = find_arduino_port()

if PORT is None:
    print("\n❌ ERROR: Arduino not found!")
    print("Fix:")
    print("1. Make sure Arduino is connected via USB")
    print("2. Install drivers if needed")
    print("3. Try unplugging and reconnecting the Arduino")
    print("\nAvailable ports:")
    for p in serial.tools.list_ports.comports():
        print(" -", p.device, ":", p.description)
    exit()

print(f"✅ Arduino found at: {PORT}")
print("Opening serial connection...")

try:
    arduino = serial.Serial(PORT, 9600, timeout=1)
except Exception as e:
    print(f"\n❌ Could not open port {PORT}")
    print("Make sure NO OTHER PROGRAM is using the port (like Arduino Serial Monitor).")
    print("Original error:", e)
    exit()

print("\n✅ Connected! Listening for data...\n")


while True:
    try:
        line = arduino.readline().decode(errors="ignore").strip()

        if not line:
            continue

        print("Received:", line)

        # Convert Arduino JSON to Python dict (e.g. {"sensor1": "occupied", ...})
        sensor_state = json.loads(line)

        # Attach live sensor state under "sensors" while keeping all website data
        full_state["sensors"] = sensor_state

        # Write the combined data (locations, slots, sensors) to data.json
        with open(DATA_PATH, "w") as f:
            json.dump(full_state, f, indent=4)

        print("✔ data.json updated with full website data + live sensor state\n")

    except json.JSONDecodeError:
        # Ignore malformed lines
        print("⚠ Invalid JSON, skipping...")
        continue

    except Exception as e:
        print("❌ Error:", e)
        time.sleep(1)
