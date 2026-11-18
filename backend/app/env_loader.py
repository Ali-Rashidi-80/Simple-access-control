"""Load .env on startup unless SKIP_DOTENV is enabled."""

import os

from dotenv import load_dotenv

if os.getenv("SKIP_DOTENV", "").lower() not in ("1", "true", "yes"):
    _current_dir = os.path.dirname(os.path.abspath(__file__))
    _backend_dir = os.path.dirname(_current_dir)
    _project_root = os.path.dirname(_backend_dir)
    for _path in (
        os.path.join(_project_root, ".env"),
        os.path.join(_backend_dir, ".env"),
        os.path.join(_current_dir, ".env"),
    ):
        if os.path.exists(_path):
            load_dotenv(_path)
            break
