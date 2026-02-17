from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Qwen3-VL Fine-Tuning UI"
    debug: bool = True

    # Paths
    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    upload_dir: Path = data_dir / "uploads"
    image_cache_dir: Path = data_dir / "image_cache"
    adapter_dir: Path = data_dir / "adapters"
    db_path: Path = data_dir / "app.db"

    # Model defaults
    default_model_name: str = "unsloth/Qwen3-VL-8B-Instruct-unsloth-bnb-4bit"
    default_max_seq_length: int = 2048

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_prefix": "QWEN3VL_"}


settings = Settings()

# Ensure directories exist
for d in [settings.data_dir, settings.upload_dir, settings.image_cache_dir, settings.adapter_dir]:
    d.mkdir(parents=True, exist_ok=True)
