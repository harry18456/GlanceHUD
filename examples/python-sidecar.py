# /// script
# dependencies = [
#   "requests",
# ]
# ///
"""
GlanceHUD Sidecar Demo — All 5 Widget Types + Settings Feedback

Demonstrates every widget type and the settings feedback loop:

  sparkline  python.demo.cpu    — CPU trend; alert_threshold controls line colour
  gauge      python.demo.gpu    — GPU usage; unit setting switches % ↔ W display
  bar-list   python.demo.disk   — Disk partitions; max_items controls row count
  key-value  python.demo.sysinfo— System info; layout setting switches column ↔ row
  text       python.demo.net    — Network speed; unit setting switches KB/s ↔ MB/s

Settings feedback loop:
  1. Each widget declares a `schema` → GlanceHUD shows it in the Settings panel.
  2. User changes a value in Settings → stored in config.json.
  3. Every POST response carries `props` with the current user values.
  4. Sidecar reads props and adjusts its data / display accordingly.

Run with `uv run python-sidecar.py` or `pip install requests && python python-sidecar.py`.
"""

import math
import random
import time

import requests

HUD_URL = "http://localhost:9090/api/widget"
INTERVAL = 2  # seconds between pushes


# ---------------------------------------------------------------------------
# Low-level helper
# ---------------------------------------------------------------------------

def push(module_id: str, *, template=None, schema=None, data=None) -> dict:
    """POST to /api/widget and return the response props (or {})."""
    payload: dict = {"module_id": module_id}
    if template is not None:
        payload["template"] = template
    if schema is not None:
        payload["schema"] = schema
    if data is not None:
        payload["data"] = data
    try:
        resp = requests.post(HUD_URL, json=payload, timeout=3)
        return resp.json().get("props") or {}
    except requests.exceptions.ConnectionError:
        print("  Connection refused — is GlanceHUD running?")
        return {}
    except Exception as exc:
        print(f"  Error: {exc}")
        return {}


# ---------------------------------------------------------------------------
# Widget definitions (template + schema)
# ---------------------------------------------------------------------------

WIDGETS = {
    # 1. Sparkline — rolling CPU trend
    #    Schema: alert_threshold
    #    Effect: line turns red when CPU exceeds the threshold
    "python.demo.cpu": {
        "template": {
            "type": "sparkline",
            "title": "CPU Trend",
            "props": {"unit": "%", "maxPoints": 30},
        },
        "schema": [
            {
                "name": "alert_threshold",
                "label": "Alert Threshold (%)",
                "type": "number",
                "default": 80,
            },
        ],
    },

    # 2. Gauge — GPU usage
    #    Schema: unit
    #    Effect: gauge suffix switches between % and W;
    #            value range changes to match the unit
    "python.demo.gpu": {
        "template": {
            "type": "gauge",
            "title": "GPU",
            "props": {"unit": "%"},
        },
        "schema": [
            {
                "name": "unit",
                "label": "Display Unit",
                "type": "select",
                "default": "%",
                "options": [
                    {"label": "Percent (%)", "value": "%"},
                    {"label": "Watts (W)",   "value": "W"},
                ],
            },
        ],
    },

    # 3. Bar-list — simulated disk partitions
    #    Schema: max_items
    #    Effect: only the top N partitions are shown
    "python.demo.disk": {
        "template": {
            "type": "bar-list",
            "title": "Disk",
            "props": {},
        },
        "schema": [
            {
                "name": "max_items",
                "label": "Max Items",
                "type": "number",
                "default": 3,
            },
        ],
    },

    # 4. Key-value — system metrics
    #    Schema: layout
    #    Effect: items render in a vertical column or a horizontal row
    "python.demo.sysinfo": {
        "template": {
            "type": "key-value",
            "title": "System",
            "props": {"layout": "column"},
        },
        "schema": [
            {
                "name": "layout",
                "label": "Layout",
                "type": "select",
                "default": "column",
                "options": [
                    {"label": "Column", "value": "column"},
                    {"label": "Row",    "value": "row"},
                ],
            },
        ],
    },

    # 5. Text — network upload speed
    #    Schema: unit
    #    Effect: sidecar converts and formats the value string on the fly
    "python.demo.net": {
        "template": {
            "type": "text",
            "title": "Network",
            "props": {},
        },
        "schema": [
            {
                "name": "unit",
                "label": "Unit",
                "type": "select",
                "default": "KB/s",
                "options": [
                    {"label": "KB/s", "value": "KB/s"},
                    {"label": "MB/s", "value": "MB/s"},
                ],
            },
        ],
    },
}

# Simulated disk partitions (label, base usage %)
_DISKS = [
    ("C:\\", 72),
    ("D:\\", 45),
    ("E:\\", 88),
    ("F:\\", 23),
    ("G:\\", 61),
]


# ---------------------------------------------------------------------------
# Per-widget data generators
# Each function receives the current time-step `t` and the latest `props`
# returned by GlanceHUD, so settings changes take effect on the next push.
# ---------------------------------------------------------------------------

def gen_cpu(t: float, props: dict) -> dict:
    """Sparkline value only.  Overrides line colour when above threshold."""
    usage = 40 + 30 * math.sin(t / 10) + random.uniform(-5, 5)
    usage = max(0.0, min(100.0, usage))

    threshold = float(props.get("alert_threshold", 80))
    data: dict = {"value": round(usage, 1)}
    if usage > threshold:
        # data.props.color overrides the auto status-colour in SparklineRenderer
        data["props"] = {"color": "#ef4444"}
    return data


def gen_gpu(t: float, props: dict) -> dict:
    """Gauge value + unit.  Switches between 0-100 % and 0-350 W ranges."""
    unit = props.get("unit", "%")
    if unit == "W":
        value = 120 + 80 * abs(math.sin(t / 7)) + random.uniform(-10, 10)
        value = max(0.0, min(350.0, value))
    else:
        value = 50 + 25 * math.sin(t / 7) + random.uniform(-5, 5)
        value = max(0.0, min(100.0, value))
    # data.props.unit overrides config.props.unit in GaugeRenderer
    return {"value": round(value, 1), "props": {"unit": unit}}


def gen_disk(t: float, props: dict) -> dict:
    """Bar-list.  Slices the partition list to max_items."""
    max_items = max(1, int(props.get("max_items", 3)))
    items = []
    for label, base in _DISKS[:max_items]:
        pct = min(100.0, max(0.0, base + random.uniform(-2, 2)))
        items.append({"label": label, "percent": round(pct, 1), "value": f"{pct:.0f}%"})
    return {"items": items}


def gen_sysinfo(t: float, props: dict) -> dict:
    """Key-value.  Mirrors the layout setting back so KVRenderer picks it up."""
    layout = props.get("layout", "column")
    cpu  = 30 + 20 * math.sin(t / 8)  + random.uniform(-3, 3)
    mem  = 60 + 10 * math.sin(t / 15) + random.uniform(-2, 2)
    temp = 55 + 10 * math.sin(t / 12) + random.uniform(-1, 1)
    return {
        "items": [
            {"key": "CPU",  "value": f"{cpu:.0f}%",   "icon": "cpu"},
            {"key": "RAM",  "value": f"{mem:.0f}%",   "icon": "memory-stick"},
            {"key": "Temp", "value": f"{temp:.0f}°C", "icon": "thermometer"},
        ],
        # Propagate layout setting so the renderer reflects the user's choice
        # (SidecarSource.GetRenderConfig returns the original template props,
        #  so we must override via data.props on every push)
        "props": {"layout": layout},
    }


def gen_net(t: float, props: dict) -> dict:
    """Text widget.  Converts speed to the user-selected unit."""
    unit = props.get("unit", "KB/s")
    speed_kb = 500 + 400 * abs(math.sin(t / 6)) + random.uniform(-50, 50)
    if unit == "MB/s":
        display = f"{speed_kb / 1024:.2f} MB/s"
    else:
        display = f"{speed_kb:.0f} KB/s"
    return {"value": display, "label": "↑ Upload"}


GENERATORS = {
    "python.demo.cpu":     gen_cpu,
    "python.demo.gpu":     gen_gpu,
    "python.demo.disk":    gen_disk,
    "python.demo.sysinfo": gen_sysinfo,
    "python.demo.net":     gen_net,
}


# ---------------------------------------------------------------------------
# Startup registration
# ---------------------------------------------------------------------------

def register_all() -> dict:
    """Send template + schema for every widget; return initial props map."""
    print("Registering widgets with GlanceHUD...")
    props_map: dict = {}
    for mid, w in WIDGETS.items():
        props = push(
            mid,
            template=w["template"],
            schema=w["schema"],
            data={"value": 0},   # initial data so widget appears immediately
        )
        props_map[mid] = props
        print(f"  ✓ {mid:30s}  props={props}")
    print()
    return props_map


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    props_map = register_all()
    print(f"Pushing every {INTERVAL}s — open Settings in GlanceHUD to try the schemas.\n")

    t = 0.0
    while True:
        for mid, gen in GENERATORS.items():
            data = gen(t, props_map[mid])
            new_props = push(mid, data=data)
            if new_props:
                props_map[mid] = new_props

        # Print a one-line summary of active settings so you can see changes
        print(
            f"t={t:5.0f}s | "
            f"cpu alert={props_map['python.demo.cpu'].get('alert_threshold', 80):>3} | "
            f"gpu unit={props_map['python.demo.gpu'].get('unit', '%'):>4} | "
            f"disk rows={props_map['python.demo.disk'].get('max_items', 3)} | "
            f"layout={props_map['python.demo.sysinfo'].get('layout', 'column'):>6} | "
            f"net unit={props_map['python.demo.net'].get('unit', 'KB/s')}"
        )

        t += INTERVAL
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
