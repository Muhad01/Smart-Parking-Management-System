import os
import serial
import serial.tools.list_ports
import json
import time


# --- Load full website parking data; this script only updates parkingdata.json ---
# This script lives in the `realtime_update` folder, JSON data is in the project-level `data` folder.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARKINGDATA_PATH = os.path.join(BASE_DIR, "..", "data", "parkingdata.json")
BOOKINGS_PATH = os.path.join(BASE_DIR, "..", "data", "bookings.json")
CONFIG_PATH = os.path.join(BASE_DIR, "..", "data", "realtime-config.json")


def find_arduino_port():
    """Automatically find the Arduino COM port."""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "CH340" in port.description or "USB-SERIAL" in port.description:
            return port.device
    return None

def load_config():
    """Load configuration from realtime-config.json."""
    try:
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
            return config
    except FileNotFoundError:
        # Return default config if file doesn't exist
        return {
            "arduino": {"port": None, "baudRate": 9600, "timeout": 1, "autoDetect": True},
            "updateInterval": 1000,
            "targetLocation": "Testing",
            "enabled": True,
            "lastUpdate": None,
            "status": "disconnected"
        }
    except Exception as e:
        print(f"⚠ Could not load config: {e}, using defaults")
        return {
            "arduino": {"port": None, "baudRate": 9600, "timeout": 1, "autoDetect": True},
            "updateInterval": 1000,
            "targetLocation": "Testing",
            "enabled": True,
            "lastUpdate": None,
            "status": "disconnected"
        }

def save_config(config):
    """Save configuration to realtime-config.json."""
    try:
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"⚠ Could not save config: {e}")

# Load configuration
config = load_config()
target_location = config.get("targetLocation", "Testing")
arduino_config = config.get("arduino", {})
auto_detect = arduino_config.get("autoDetect", True)
baud_rate = arduino_config.get("baudRate", 9600)
timeout_val = arduino_config.get("timeout", 1)

print("Searching for Arduino...")

# Use configured port or auto-detect
PORT = arduino_config.get("port") if not auto_detect and arduino_config.get("port") else find_arduino_port()

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
    arduino = serial.Serial(PORT, baud_rate, timeout=timeout_val)
    # Update config with successful connection
    config["arduino"]["port"] = PORT
    config["status"] = "connected"
    save_config(config)
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

        # Convert Arduino JSON to Python dict.
        # Expected format (flexible):
        #   {"1": true, "2": false, "3": true}
        #   {"slot1": 1, "slot2": 0, "slot3": 1}
        #   etc. (keys must contain the slot number).
        sensor_state = json.loads(line)
        print("Parsed sensor_state:", sensor_state)

        # Load the latest parking data from disk
        with open(PARKINGDATA_PATH, "r") as f:
            parking_data = json.load(f)

        # Figure out the index/id of the Testing location so we can match bookings
        testing_location = None
        testing_location_index = None

        # Find the target location (from config) and its index
        for idx, loc in enumerate(parking_data.get("locations", [])):
            if loc.get("name") == target_location:
                testing_location = loc
                testing_location_index = idx
                break

        if testing_location is None:
            print(f"⚠ '{target_location}' location not found in parkingdata.json")
            continue

        # Derive the locationId used in bookings.json (loc_1, loc_2, ...)
        testing_location_id = None
        if testing_location_index is not None:
            testing_location_id = f"loc_{testing_location_index + 1}"

        # Load current bookings to see which Testing slots are booked and unpaid
        booked_unpaid_slots = set()
        try:
            with open(BOOKINGS_PATH, "r") as bf:
                bookings_data = json.load(bf)
                for b in bookings_data.get("bookings", []):
                    is_unpaid = not b.get("paid")
                    loc_name = b.get("locationName")
                    loc_id = b.get("locationId")
                    slot_no = b.get("slotNumber")

                    if not is_unpaid or not isinstance(slot_no, int):
                        continue

                    if loc_name == target_location or (testing_location_id and loc_id == testing_location_id):
                        booked_unpaid_slots.add(slot_no)
        except FileNotFoundError:
            # No bookings yet, that's fine
            booked_unpaid_slots = set()
        except Exception as e:
            print("⚠ Could not read bookings.json:", e)
            booked_unpaid_slots = set()

        # Update only the Testing location slots based on sensor_state
        slots = testing_location.get("slots", [])

        # Helper: normalize a raw sensor value to a boolean occupied flag
        def to_occupied(v):
            if isinstance(v, (int, float)):
                return v != 0
            if isinstance(v, str):
                vs = v.strip().lower()
                if vs in {"1", "true", "t", "yes", "y", "occupied"}:
                    return True
                if vs in {"0", "false", "f", "no", "n", "empty", "vacant", "unoccupied"}:
                    return False
                # Fallback: any non-empty string counts as True
                return True
            return bool(v)

        updated_any = False

        for slot in slots:
            slot_number = slot.get("slotNumber")
            slot_no = str(slot_number)

            # If this slot has an unpaid booking, always treat it as occupied
            if isinstance(slot_number, int) and slot_number in booked_unpaid_slots:
                print(f"Slot {slot_no} has an unpaid booking -> forcing isOccupied=True")
                slot["isOccupied"] = True
                updated_any = True
                continue

            # Otherwise, use Arduino sensor data
            # Try direct key match: "1", "2", ...
            raw_val = None
            if slot_no in sensor_state:
                raw_val = sensor_state[slot_no]
            else:
                # Try to match keys that CONTAIN the slot number, e.g. "slot1", "SLOT_2", etc.
                for key, value in sensor_state.items():
                    if slot_no in str(key):
                        raw_val = value
                        break

            if raw_val is None:
                # Nothing for this slot in the current sensor payload
                continue

            occupied_flag = to_occupied(raw_val)
            print(f"Updating Testing slot {slot_no}: raw={raw_val} -> isOccupied={occupied_flag}")
            slot["isOccupied"] = occupied_flag
            updated_any = True

        if not updated_any:
            print("⚠ No Testing slots were updated from this sensor_state payload.")

        # Recalculate summary fields for Testing location based on updated slots
        total_slots = len(slots)
        occupied_slots = sum(1 for s in slots if s.get("isOccupied"))
        available_slots = total_slots - occupied_slots

        testing_location["totalSlots"] = total_slots
        testing_location["occupiedSlots"] = occupied_slots
        testing_location["availableSlots"] = available_slots

        # Persist the updated parking data (only target location slots changed)
        with open(PARKINGDATA_PATH, "w") as f:
            json.dump(parking_data, f, indent=2)

        # Update config with last update timestamp
        config["lastUpdate"] = time.strftime("%Y-%m-%d %H:%M:%S")
        config["status"] = "connected"
        save_config(config)

        print(f"✔ parkingdata.json {target_location} slots updated from Arduino\n")

    except json.JSONDecodeError:
        # Ignore malformed lines
        print("⚠ Invalid JSON, skipping...")
        continue

    except Exception as e:
        print("❌ Error:", e)
        time.sleep(1)
