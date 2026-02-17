import torch


def get_gpu_stats() -> dict:
    if not torch.cuda.is_available():
        return {"available": False}

    device = torch.cuda.current_device()
    mem_allocated = torch.cuda.memory_allocated(device)
    mem_reserved = torch.cuda.memory_reserved(device)
    mem_total = torch.cuda.get_device_properties(device).total_memory

    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(device)
        util = pynvml.nvmlDeviceGetUtilizationRates(handle)
        temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
        gpu_utilization = util.gpu
        gpu_temp = temp
        pynvml.nvmlShutdown()
    except Exception:
        gpu_utilization = None
        gpu_temp = None

    return {
        "available": True,
        "device_name": torch.cuda.get_device_name(device),
        "memory_allocated_mb": round(mem_allocated / 1024**2, 1),
        "memory_reserved_mb": round(mem_reserved / 1024**2, 1),
        "memory_total_mb": round(mem_total / 1024**2, 1),
        "memory_utilization_pct": round(mem_allocated / mem_total * 100, 1),
        "gpu_utilization_pct": gpu_utilization,
        "temperature_c": gpu_temp,
    }
