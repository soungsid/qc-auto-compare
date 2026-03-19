"""
Bridge module for Emergent platform compatibility.
This imports the FastAPI app from the main module structure.
"""

from app.main import app

__all__ = ["app"]
