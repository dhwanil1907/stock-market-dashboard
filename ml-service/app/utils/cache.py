import time
import asyncio
from typing import Dict, Any, Optional

class TTLCache:
    def __init__(self, ttl_seconds: int = 14400): # 4 hours
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl_seconds
        self.lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self.lock:
            if key in self.cache:
                item = self.cache[key]
                if time.time() - item['timestamp'] < self.ttl:
                    return item['value']
                else:
                    del self.cache[key]
            return None

    async def set(self, key: str, value: Any):
        async with self.lock:
            self.cache[key] = {
                'value': value,
                'timestamp': time.time()
            }

# Global cache instance
prediction_cache = TTLCache()
