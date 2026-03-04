"""
LDU Grant Operations — Base Agent
All agents inherit from this class. Provides logging, error handling, and retry logic.
"""

import os
from datetime import datetime
from abc import ABC, abstractmethod
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential


# Configure logging
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger.add(
    os.path.join(LOG_DIR, "agents_{time:YYYY-MM-DD}.log"),
    rotation="1 day",
    retention="30 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name} | {message}",
)


class BaseAgent(ABC):
    """
    Base class for all LDU Grant Operations agents.
    Provides logging, error handling, and common utilities.
    """

    def __init__(self, name: str):
        self.name = name
        self.logger = logger.bind(agent=name)
        self.logger.info(f"Agent initialized: {name}")

    @abstractmethod
    def run(self, **kwargs):
        """Execute the agent's primary task. Must be implemented by subclasses."""
        pass

    def log_activity(self, action: str, details: str = ""):
        """Log an agent activity with timestamp."""
        self.logger.info(f"[{self.name}] {action}: {details}")

    def log_error(self, action: str, error: Exception):
        """Log an error with full context."""
        self.logger.error(f"[{self.name}] ERROR in {action}: {str(error)}")

    def log_success(self, action: str, result: str = ""):
        """Log a successful operation."""
        self.logger.success(f"[{self.name}] SUCCESS: {action} — {result}")

    @staticmethod
    def timestamp() -> str:
        """Return current ISO timestamp."""
        return datetime.now().isoformat()

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=30))
    def retry_operation(func, *args, **kwargs):
        """Execute a function with automatic retry on failure (3 attempts, exponential backoff)."""
        return func(*args, **kwargs)
