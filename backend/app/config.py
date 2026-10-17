"""config.py

WHAT THIS FILE DOES
    Reads settings from environment variables, with safe local defaults.

SETTINGS
    DATABASE_URL  where the database lives (SQLite file by default)
    EVIDENCE_DIR  folder holding uploaded files named by their hash
    KEY_DIR       folder holding signing private keys. Kept apart from
                  the database on purpose, so stealing the database
                  does not let someone forge signatures.
    DATA_DIR      folder with emission factor and default value files
"""

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    database_url: str
    evidence_dir: Path
    key_dir: Path
    data_dir: Path


def load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///temper.db"),
        evidence_dir=Path(os.getenv("EVIDENCE_DIR", "storage/evidence")),
        key_dir=Path(os.getenv("KEY_DIR", "storage/keys")),
        data_dir=Path(os.getenv("DATA_DIR", str(ROOT / "data"))),
    )
