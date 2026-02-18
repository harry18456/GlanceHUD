# /// script
# dependencies = [
#   "requests",
# ]
# ///

import requests
import time
import random

# Configuration
HUD_API_URL = "http://localhost:9090/api/widget"
INTERVAL = 2  # Seconds

# ---------------------------------------------------------
# 1. Initialize & Register Widgets (Lazy Registration)
# ---------------------------------------------------------
def register_widgets():
    """Register widgets and return initial user props from response."""
    print("Initializing widgets...")

    # Widget 1: Fake GPU Monitor (Text)
    # Includes `schema` so users can adjust settings via GlanceHUD Settings UI.
    # The response `props` will contain the current values of these settings.
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
        "schema": [
            {
                "name": "alert_threshold",
                "label": "Alert Threshold (%)",
                "type": "number",
                "default": 80
            }
        ],
        "data": {
            "value": 0,
            "label": "Init..."
        }
    }

    # Widget 2: Weather Info (Key-Value) — no schema, static display
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

    gpu_props = {}
    try:
        resp = requests.post(HUD_API_URL, json=gpu_payload)
        if resp.status_code == 200:
            gpu_props = resp.json().get("props") or {}
        else:
            print(f"Failed to initialize GPU widget: {resp.status_code}")

        resp = requests.post(HUD_API_URL, json=weather_payload)
        if resp.status_code != 200:
            print(f"Failed to initialize Weather widget: {resp.status_code}")

        print("Widgets initialized via Lazy Registration.")
    except Exception as e:
        print(f"Failed to initialize widgets: {e}")
        print("Ensure GlanceHUD is running on localhost:9090")

    return gpu_props


# ---------------------------------------------------------
# 2. Main Loop (Push Data)
# ---------------------------------------------------------
def main():
    gpu_props = register_widgets()
    alert_threshold = gpu_props.get("alert_threshold", 80)
    print(f"Starting push loop (Interval: {INTERVAL}s, alert_threshold={alert_threshold}%)...")

    i = 0
    while True:
        try:
            if i % 2 == 0:
                # Simulate GPU Data (Type: Text)
                gpu_usage = random.randint(20, 95)

                gpu_color = "text-purple-500"
                if gpu_usage > alert_threshold:
                    gpu_color = "text-red-500"

                payload = {
                    "module_id": "python.example.gpu",
                    "data": {
                        "value": f"{gpu_usage}%",
                        "label": "GPU Load",
                        "props": {
                            "color": gpu_color
                        }
                    }
                }
                resp = requests.post(HUD_API_URL, json=payload)

                # Read back user settings on every push
                if resp.status_code == 200:
                    new_props = resp.json().get("props") or {}
                    alert_threshold = new_props.get("alert_threshold", alert_threshold)

                print(f"Pushed: GPU={gpu_usage}% (alert at {alert_threshold}%)")
            else:
                # Simulate Weather Data (Type: Key-Value)
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
