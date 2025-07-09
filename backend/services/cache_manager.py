# backend/services/cache_manager.py

import json
import hashlib
import redis
from ..config import CACHE_TYPE, REDIS_URL

class CacheInterface:
    def get(self, key: str):
        raise NotImplementedError

    def set(self, key: str, value: dict, ttl: int = 3600):
        raise NotImplementedError

    def _generate_cache_key(self, data: dict, prefix: str) -> str:
        """Generates a unique MD5 hash for the given data with a prefix."""
        cache_string = prefix + json.dumps(data, sort_keys=True)
        return hashlib.md5(cache_string.encode('utf-8')).hexdigest()

class RedisCache(CacheInterface):
    def __init__(self, redis_url: str):
        try:
            self.client = redis.from_url(redis_url)
            self.client.ping() # Check connection
            print("Redis cache connected successfully.")
        except Exception as e:
            print(f"Could not connect to Redis: {e}. Falling back to in-memory cache.")
            # Fallback to a dummy client if connection fails
            self.client = None

    def get(self, key: str):
        if not self.client:
            return None
        try:
            cached_value = self.client.get(key)
            if cached_value:
                print(f"Loading from Redis cache with key: {key}")
                return json.loads(cached_value)
            return None
        except Exception as e:
            print(f"Error getting from Redis: {e}")
            return None

    def set(self, key: str, value: dict, ttl: int = 3600):
        if not self.client:
            return
        try:
            self.client.set(key, json.dumps(value), ex=ttl)
            print(f"Saved to Redis cache with key: {key}")
        except Exception as e:
            print(f"Error setting to Redis: {e}")

class InMemoryCache(CacheInterface):
    def __init__(self):
        self._cache = {}
        print("Using in-memory cache.")

    def get(self, key: str):
        if key in self._cache:
            print(f"Loading from in-memory cache with key: {key}")
            return self._cache[key]
        return None

    def set(self, key: str, value: dict, ttl: int = 3600):
        self._cache[key] = value
        print(f"Saved to in-memory cache with key: {key}")

class CacheManager:
    def __init__(self, cache_type: str, redis_url: str = None):
        if cache_type.lower() == 'redis':
            self.cache_backend = RedisCache(redis_url)
            if not self.cache_backend.client: # Fallback if Redis connection failed
                self.cache_backend = InMemoryCache()
        else:
            self.cache_backend = InMemoryCache()

    def get_cached_response(self, cache_data: dict, cache_prefix: str = "cache") -> dict | None:
        cache_key = self.cache_backend._generate_cache_key(cache_data, cache_prefix)
        return self.cache_backend.get(cache_key)

    def save_to_cache(self, cache_data: dict, response_data: dict, cache_prefix: str = "cache", ttl: int = 3600):
        cache_key = self.cache_backend._generate_cache_key(cache_data, cache_prefix)
        self.cache_backend.set(cache_key, response_data, ttl)

# --- Singleton instance of the CacheManager ---
cache_manager = CacheManager(cache_type=CACHE_TYPE, redis_url=REDIS_URL)
