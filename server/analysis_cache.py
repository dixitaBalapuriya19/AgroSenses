"""
Server-side Analysis Caching and Optimization
Improves performance by caching results and optimizing timeouts
"""

import hashlib
import time
from collections import OrderedDict
from threading import Lock


class ImageAnalysisCache:
    """
    In-memory cache for analysis results with LRU eviction policy.
    Uses image hash to match similar/identical uploads.
    """
    
    def __init__(self, max_size=50, ttl_seconds=3600):
        """
        Initialize cache
        
        Args:
            max_size: Maximum number of cached results (LRU eviction)
            ttl_seconds: Time-to-live for cached results
        """
        self.cache = OrderedDict()
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.lock = Lock()
        self.hits = 0
        self.misses = 0
    
    def get_image_hash(self, image_bytes: bytes) -> str:
        """
        Generate SHA256 hash of image bytes
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Hex digest of SHA256 hash
        """
        return hashlib.sha256(image_bytes).hexdigest()
    
    def get(self, image_hash: str) -> dict | None:
        """
        Retrieve cached analysis result
        
        Args:
            image_hash: Image hash from get_image_hash()
            
        Returns:
            Cached result dict or None if not found/expired
        """
        with self.lock:
            if image_hash not in self.cache:
                self.misses += 1
                return None
            
            entry = self.cache[image_hash]
            
            # Check if expired
            if time.time() - entry['timestamp'] > self.ttl_seconds:
                del self.cache[image_hash]
                self.misses += 1
                return None
            
            # Move to end (LRU)
            self.cache.move_to_end(image_hash)
            self.hits += 1
            
            return entry['result']
    
    def set(self, image_hash: str, result: dict) -> None:
        """
        Store analysis result in cache
        
        Args:
            image_hash: Image hash from get_image_hash()
            result: Analysis result dict to cache
        """
        with self.lock:
            # Remove oldest if at capacity and new entry
            if image_hash not in self.cache and len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            
            # Add or update entry
            if image_hash in self.cache:
                self.cache.move_to_end(image_hash)
            
            self.cache[image_hash] = {
                'result': result,
                'timestamp': time.time()
            }
    
    def clear(self) -> None:
        """Clear all cached results"""
        with self.lock:
            self.cache.clear()
            self.hits = 0
            self.misses = 0
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        with self.lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'size': len(self.cache),
                'max_size': self.max_size,
                'hits': self.hits,
                'misses': self.misses,
                'total_requests': total_requests,
                'hit_rate_percent': round(hit_rate, 2)
            }


# Global cache instance
analysis_cache = ImageAnalysisCache(max_size=100, ttl_seconds=3600)


# Optimized timeout values (reduced from original)
# These are tuned for compressed images that process faster
OPTIMIZED_TIMEOUTS = {
    'local': 8,           # Local LLM - fastest, was 12s
    'hf': 15,             # HuggingFace - was 20s  
    'gemini': 45,         # Gemini - was 60s
}


def get_optimized_timeout(provider: str) -> int:
    """Get optimized timeout for a provider"""
    return OPTIMIZED_TIMEOUTS.get(provider.lower(), 30)
