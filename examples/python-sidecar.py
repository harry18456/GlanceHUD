# /// script
# dependencies = [
#   "requests",
# ]
# ///

import requests
import time
import random
import platform

# Configuration
HUD_API_URL = "http://localhost:9090/api/widget"
INTERVAL = 2  # Seconds

# ---------------------------------------------------------
# 1. Initialize & Register Widgets (Lazy Registration)
# ---------------------------------------------------------
def register_widgets():
    print("Initializing widgets...")
    
    # Widget 1: Fake GPU Monitor (Gauge)
    gpu_payload = {
        "module_id": "python.example.gpu",
        "template": {
            "type": "text",
            "title": "GPU Load",
            "props": {
                "unit": "%",
                "color": "text-purple-500"
            }
        },
        "data": {
            "value": 0,
            "label": "Init..."
        }
    }
    
    # Widget 2: Weather Info (Key-Value)
    weather_payload = {
        "module_id": "python.example.weather",
        "template": {
            "type": "key-value",
            "title": "Taipei Weather",
            "props": {
                "layout": "row"
            }
        },
        "data": {
            "items": [
                {"key": "Temp", "value": "--°C", "icon": "thermometer"},
                {"key": "Rain", "value": "--%", "icon": "cloud-rain"}
            ]
        }
    }

    # Send initial payloads
    try:
        response = requests.post(HUD_API_URL, json=gpu_payload)
        if response.status_code != 200:
            print(f"Failed to initialize widgets: {response.status_code}")
        response = requests.post(HUD_API_URL, json=weather_payload)
        if response.status_code != 200:
            print(f"Failed to initialize widgets: {response.status_code}")
        print("Widgets initialized via Lazy Registration.")
    except Exception as e:
        print(f"Failed to initialize widgets: {e}")
        print("Ensure GlanceHUD is running on localhost:9090")

# ---------------------------------------------------------
# 2. Main Loop (Push Data)
# ---------------------------------------------------------
def main():
    register_widgets()
    
    print(f"Starting push loop (Interval: {INTERVAL}s)...")
    
    i = 0 # Initialize counter for alternating updates
    while True:
        try:
            if i % 2 == 0:
                # Simulate GPU Data (Type: Text)
                # TextRenderer expects: value (main display), label (optional title override)
                gpu_usage = random.randint(20, 95)
                print(f"gpu usage: {gpu_usage}")
                
                gpu_color = "text-purple-500"
                if gpu_usage > 80:
                    gpu_color = "text-red-500"

                payload = {
                    "module_id": "python.example.gpu",
                    "data": {
                        "value": f"{gpu_usage}%", # Main value
                        "label": "GPU Load",      # Override title
                        "props": {
                            "color": gpu_color
                        }
                    }
                }
                requests.post(HUD_API_URL, json=payload)
                print(f"Pushed: GPU={gpu_usage}%")
            else:
                # Simulate Weather Data (Type: Key-Value)
                # KVRenderer expects: items [{key, value, icon?}]
                temp = random.randint(20, 30)
                humid = random.randint(40, 80)
                
                payload = {
                    "module_id": "python.example.weather",
                    "data": {
                        "items": [
                            {"key": "Temp", "value": f"{temp}C", "icon": "sun"},
                            {"key": "Humid", "value": f"{humid}%", "icon": "cloud-rain"}
                        ]
                    }
                }
                requests.post(HUD_API_URL, json=payload)
                print(f"Pushed: Temp={temp}C, Humid={humid}%")
            
        except requests.exceptions.ConnectionError:
            print("Connection failed. Is GlanceHUD running?")
        except Exception as e:
            print(f"Error: {e}")
            
        i += 1
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
