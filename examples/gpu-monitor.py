# /// script
# dependencies = [
#   "nvidia-ml-py",
#   "requests",
# ]
# ///
"""
GlanceHUD GPU Monitor — Real NVIDIA GPU Monitoring Sidecar

Replaces gpustat / nvitop for trade-show or daily monitoring.
Automatically detects all NVIDIA GPUs and creates 3 widgets per GPU:

  gpu.{i}       sparkline  — Core utilisation trend (%)
  gpu.{i}.info  key-value  — VRAM · Temperature · Power · Fan
  gpu.{i}.procs bar-list   — Top processes sorted by VRAM usage

Requirements
------------
  NVIDIA GPU + driver (NVML must be accessible)
  pip install nvidia-ml-py requests
  — or —
  uv run gpu-monitor.py       (uv resolves deps automatically)

Settings (editable in GlanceHUD Settings panel)
-----------------------------------------------
  alert_threshold  % — Sparkline line turns red above this value (default 80)
  show_procs       — Show / hide the process widget (default true)
  max_procs        — Max rows in the process bar-list (default 5)
"""

import sys
import time

import requests

HUD_URL = "http://localhost:9090/api/widget"
INTERVAL = 1  # seconds between updates


# ---------------------------------------------------------------------------
# Transport helper
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
        print("  Connection refused — is GlanceHUD running on localhost:9090?")
        return {}
    except Exception as exc:
        print(f"  Push error: {exc}")
        return {}


# ---------------------------------------------------------------------------
# GPU data collection via NVML
# ---------------------------------------------------------------------------

def collect_gpu(handle) -> dict:
    """Read all metrics from a single GPU handle. Returns a flat dict."""
    import pynvml

    metrics: dict = {}

    # Core & memory utilisation
    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
    metrics["core_pct"] = util.gpu
    metrics["mem_pct"] = util.memory

    # Memory (bytes → GB)
    mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
    metrics["mem_used_gb"] = mem.used / 1024 ** 3
    metrics["mem_total_gb"] = mem.total / 1024 ** 3

    # Temperature
    try:
        metrics["temp_c"] = pynvml.nvmlDeviceGetTemperature(
            handle, pynvml.NVML_TEMPERATURE_GPU
        )
    except pynvml.NVMLError:
        metrics["temp_c"] = None

    # Power (milliwatts → watts)
    try:
        metrics["power_w"] = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000
    except pynvml.NVMLError:
        metrics["power_w"] = None
    try:
        metrics["power_limit_w"] = pynvml.nvmlDeviceGetEnforcedPowerLimit(handle) / 1000
    except pynvml.NVMLError:
        metrics["power_limit_w"] = None

    # Fan speed
    try:
        metrics["fan_pct"] = pynvml.nvmlDeviceGetFanSpeed(handle)
    except pynvml.NVMLError:
        metrics["fan_pct"] = None

    # Running processes
    try:
        procs = pynvml.nvmlDeviceGetComputeRunningProcesses(handle)
        metrics["procs"] = [
            {
                "pid": p.pid,
                "vram_mb": p.usedGpuMemory // (1024 * 1024) if p.usedGpuMemory else 0,
            }
            for p in procs
        ]
    except pynvml.NVMLError:
        metrics["procs"] = []

    return metrics


def get_process_name(pid: int) -> str:
    """Return a short process name for the given PID (best-effort)."""
    try:
        import os
        if sys.platform == "win32":
            import ctypes
            import ctypes.wintypes as wt
            PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            hnd = ctypes.windll.kernel32.OpenProcess(
                PROCESS_QUERY_LIMITED_INFORMATION, False, pid
            )
            if not hnd:
                return str(pid)
            buf = ctypes.create_unicode_buffer(260)
            size = wt.DWORD(260)
            ctypes.windll.kernel32.QueryFullProcessImageNameW(hnd, 0, buf, ctypes.byref(size))
            ctypes.windll.kernel32.CloseHandle(hnd)
            return os.path.basename(buf.value) or str(pid)
        else:
            # Linux: /proc/{pid}/comm
            with open(f"/proc/{pid}/comm") as f:
                return f.read().strip()
    except Exception:
        return str(pid)


# ---------------------------------------------------------------------------
# Widget data builders
# ---------------------------------------------------------------------------

def build_sparkline_data(metrics: dict, props: dict) -> dict:
    """Sparkline — core utilisation; turns red above alert_threshold."""
    core = metrics["core_pct"]
    threshold = float(props.get("alert_threshold", 80))
    data: dict = {"value": core}
    if core > threshold:
        data["props"] = {"color": "#ef4444"}
    return data


def build_info_data(metrics: dict) -> dict:
    """Key-value — VRAM / Temp / Power / Fan."""
    mem_str = f"{metrics['mem_used_gb']:.1f}/{metrics['mem_total_gb']:.0f} GB"
    items = [
        {"key": "VRAM", "value": mem_str, "icon": "memory-stick"},
    ]

    if metrics["temp_c"] is not None:
        temp_str = f"{metrics['temp_c']}°C"
        items.append({"key": "Temp", "value": temp_str, "icon": "thermometer"})

    if metrics["power_w"] is not None:
        if metrics["power_limit_w"]:
            power_str = f"{metrics['power_w']:.0f}/{metrics['power_limit_w']:.0f} W"
        else:
            power_str = f"{metrics['power_w']:.0f} W"
        items.append({"key": "Power", "value": power_str, "icon": "zap"})

    if metrics["fan_pct"] is not None:
        items.append({"key": "Fan", "value": f"{metrics['fan_pct']}%", "icon": "wind"})

    return {"items": items}


def build_procs_data(metrics: dict, props: dict) -> dict:
    """Bar-list — top GPU processes sorted by VRAM, capped at max_procs."""
    max_procs = max(1, int(props.get("max_procs", 5)))
    total_mb = metrics["mem_total_gb"] * 1024

    procs = sorted(metrics["procs"], key=lambda p: p["vram_mb"], reverse=True)
    items = []
    for p in procs[:max_procs]:
        name = get_process_name(p["pid"])
        pct = (p["vram_mb"] / total_mb * 100) if total_mb > 0 else 0
        items.append(
            {
                "label": name,
                "percent": round(pct, 1),
                "value": f"{p['vram_mb']} MB",
            }
        )
    return {"items": items}


# ---------------------------------------------------------------------------
# Startup registration
# ---------------------------------------------------------------------------

SPARKLINE_SCHEMA = [
    {
        "name": "alert_threshold",
        "label": "Alert Threshold (%)",
        "type": "number",
        "default": 80,
    },
]

PROCS_SCHEMA = [
    {
        "name": "show_procs",
        "label": "Show Process Widget",
        "type": "bool",
        "default": True,
    },
    {
        "name": "max_procs",
        "label": "Max Processes",
        "type": "number",
        "default": 5,
    },
]


def register_gpu(idx: int, name: str) -> dict:
    """Register all widgets for GPU {idx} and return initial props_map."""
    short_name = name.replace("NVIDIA GeForce ", "").replace("NVIDIA ", "")
    props_map: dict = {}

    # Sparkline — core utilisation
    usage_id = f"gpu.{idx}"
    props_map[usage_id] = push(
        usage_id,
        template={
            "type": "sparkline",
            "title": f"{short_name} Core",
            "props": {"unit": "%", "maxPoints": 60},
        },
        schema=SPARKLINE_SCHEMA,
        data={"value": 0},
    )
    print(f"  ✓ {usage_id:25s}  '{name}'  props={props_map[usage_id]}")

    # Key-value — stats
    info_id = f"gpu.{idx}.info"
    props_map[info_id] = push(
        info_id,
        template={
            "type": "key-value",
            "title": f"{short_name} Stats",
            "props": {},
        },
        data={"items": []},
    )
    print(f"  ✓ {info_id:25s}")

    # Bar-list — processes
    procs_id = f"gpu.{idx}.procs"
    props_map[procs_id] = push(
        procs_id,
        template={
            "type": "bar-list",
            "title": f"{short_name} Processes",
            "props": {},
        },
        schema=PROCS_SCHEMA,
        data={"items": []},
    )
    print(f"  ✓ {procs_id:25s}")

    return props_map


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    try:
        import pynvml
    except ImportError:
        print("nvidia-ml-py not installed.  Run: pip install nvidia-ml-py requests")
        sys.exit(1)

    try:
        pynvml.nvmlInit()
    except pynvml.NVMLError as exc:
        print(f"NVML init failed: {exc}")
        print("Ensure NVIDIA drivers are installed and the GPU is accessible.")
        sys.exit(1)

    count = pynvml.nvmlDeviceGetCount()
    if count == 0:
        print("No NVIDIA GPUs found.")
        pynvml.nvmlShutdown()
        sys.exit(1)

    handles = [pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(count)]
    names = [pynvml.nvmlDeviceGetName(h) for h in handles]

    print(f"Found {count} NVIDIA GPU(s):")
    for i, name in enumerate(names):
        print(f"  [{i}] {name}")
    print()

    # Register widgets
    print("Registering widgets with GlanceHUD...")
    all_props: list[dict] = []
    for i, (handle, name) in enumerate(zip(handles, names)):
        props_map = register_gpu(i, name)
        all_props.append(props_map)
    print()

    print(
        f"Monitoring {count} GPU(s) every {INTERVAL}s — "
        "open Settings in GlanceHUD to customise.\n"
    )

    try:
        while True:
            for i, handle in enumerate(handles):
                props = all_props[i]
                metrics = collect_gpu(handle)

                # Sparkline
                usage_id = f"gpu.{i}"
                new_props = push(usage_id, data=build_sparkline_data(metrics, props.get(usage_id, {})))
                if new_props:
                    props[usage_id] = new_props

                # Info
                info_id = f"gpu.{i}.info"
                push(info_id, data=build_info_data(metrics))

                # Processes (respect show_procs setting)
                procs_id = f"gpu.{i}.procs"
                procs_props = props.get(procs_id, {})
                new_procs_props = push(procs_id, data=build_procs_data(metrics, procs_props))
                if new_procs_props:
                    props[procs_id] = new_procs_props

                # Terminal summary
                core = metrics["core_pct"]
                mem_str = f"{metrics['mem_used_gb']:.1f}/{metrics['mem_total_gb']:.0f}GB"
                temp_str = f"{metrics['temp_c']}°C" if metrics["temp_c"] is not None else "--"
                power_str = f"{metrics['power_w']:.0f}W" if metrics["power_w"] is not None else "--"
                print(
                    f"GPU[{i}] core={core:3d}% | VRAM={mem_str} | "
                    f"temp={temp_str} | pwr={power_str} | "
                    f"procs={len(metrics['procs'])}"
                )

            time.sleep(INTERVAL)
    finally:
        pynvml.nvmlShutdown()


if __name__ == "__main__":
    main()
