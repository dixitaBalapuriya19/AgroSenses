/**
 * Session Cache for Analysis Results
 * Stores results in memory to avoid re-analyzing similar images
 */

class AnalysisCache {
  constructor(maxSize = 20) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get cached analysis result
   * @param {string} imageHash - Hash of the image
   * @returns {object|null} - Cached result or null if not found
   */
  get(imageHash) {
    const entry = this.cache.get(imageHash)
    if (entry) {
      // Update last access time (LRU)
      entry.lastAccess = Date.now()
      console.log(`✅ Cache hit for image ${imageHash}`)
      return entry.result
    }
    return null
  }

  /**
   * Set cached analysis result
   * @param {string} imageHash - Hash of the image
   * @param {object} result - Analysis result
   */
  set(imageHash, result) {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(imageHash)) {
      let oldestKey = null
      let oldestTime = Infinity

      for (const [key, value] of this.cache.entries()) {
        if (value.lastAccess < oldestTime) {
          oldestTime = value.lastAccess
          oldestKey = key
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey)
        console.log(`Cache evicted oldest entry`)
      }
    }

    this.cache.set(imageHash, {
      result,
      timestamp: Date.now(),
      lastAccess: Date.now()
    })

    console.log(`Cached result for image ${imageHash}`)
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear()
    console.log('Analysis cache cleared')
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([hash, { timestamp }]) => ({
        hash,
        age: Date.now() - timestamp
      }))
    }
  }
}

export const analysisCache = new AnalysisCache(20)
