/**
 * Image Optimization Utility
 * Compresses images before sending to backend to reduce analysis time
 */

/**
 * Compress and optimize image for faster processing
 * @param {string} dataUrl - Base64 data URL of the image
 * @param {number} maxWidth - Maximum width in pixels (default: 1024)
 * @param {number} maxHeight - Maximum height in pixels (default: 1024)
 * @param {number} quality - JPEG/WebP quality 0-1 (default: 0.85)
 * @returns {Promise<string>} - Optimized data URL
 */
export async function optimizeImage(dataUrl, maxWidth = 1024, maxHeight = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      // Create canvas with resized dimensions
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height
        if (width > height) {
          width = maxWidth
          height = Math.round(maxWidth / aspectRatio)
        } else {
          height = maxHeight
          width = Math.round(maxHeight * aspectRatio)
        }
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      // Smooth image rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to WebP for better compression, fall back to JPEG
      let optimizedUrl
      try {
        optimizedUrl = canvas.toDataURL('image/webp', quality)
      } catch {
        console.warn('WebP not supported, using JPEG')
        optimizedUrl = canvas.toDataURL('image/jpeg', quality)
      }
      
      const originalSize = Math.round(dataUrl.length / 1024)
      const compressedSize = Math.round(optimizedUrl.length / 1024)
      const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100)
      
      console.log(`Image optimized: ${originalSize}KB → ${compressedSize}KB (${compressionRatio}% reduction)`)
      
      resolve(optimizedUrl)
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'))
    }
    
    img.src = dataUrl
  })
}

/**
 * Calculate visual quality preservation after compression
 * @param {number} originalSize - Original file size in bytes
 * @param {number} compressedSize - Compressed file size in bytes
 * @returns {number} - Quality score 0-100
 */
export function getQualityScore(originalSize, compressedSize) {
  const ratio = compressedSize / originalSize
  // 90% of original = excellent (95 quality)
  // 50% of original = good (85 quality)
  // 10% of original = acceptable (70 quality)
  if (ratio > 0.9) return 95
  if (ratio > 0.7) return 90
  if (ratio > 0.5) return 85
  if (ratio > 0.3) return 75
  return 70
}

/**
 * Generate image hash for caching (simple hash, not cryptographic)
 * @param {string} dataUrl - Data URL to hash
 * @returns {string} - Hash string
 */
export function getImageHash(dataUrl) {
  let hash = 0
  const str = dataUrl.substring(0, 500) // hash only first 500 chars for speed
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
