import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion' // eslint-disable-line no-unused-vars
import Hero from './components/Hero'
import UploadZone from './components/UploadZone'
import AnalysisResults from './components/AnalysisResults'
import ScanHistory from './components/ScanHistory'
import ThemeToggle from './components/ThemeToggle'
import CareOptions from './components/CareOptions'
import BasicCareTips from './components/BasicCareTips'
import SeasonalCareTips from './components/SeasonalCareTips'
import WeatherSoilData from './components/WeatherSoilData'
import { API_BASE_URLS } from './config/api'
import { t } from './translations'
import { optimizeImage, getImageHash } from './utils/imageOptimizer'
import { analysisCache } from './utils/analysisCache'

const ANALYZE_TIMEOUT_MS = 120000 // Reduced from 180s - optimized images load faster
const ANALYZE_MAX_ATTEMPTS = 1 // Reduced from 2 - compression eliminates need for retries

function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState('home') // 'home', 'basic', 'seasonal', 'analysis', 'environmental'

  // State
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [language, setLanguage] = useState(() => {
    // Persist language in localStorage
    const saved = localStorage.getItem('language')
    return saved || 'english'
  })

  // Save language preference whenever it changes
  useEffect(() => {
    localStorage.setItem('language', language)
    console.log('Language changed to:', language)
  }, [language])

  // Theme State
  const [isDark, setIsDark] = useState(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Apply theme class to body
    if (isDark) {
      document.body.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)

  const formatProviderStatus = (providerStatus) => {
    if (!providerStatus || typeof providerStatus !== 'object') {
      return ''
    }

    return Object.entries(providerStatus)
      .map(([provider, status]) => `${provider}: ${status}`)
      .join(' | ')
  }

  const fetchWithApiFallback = async (path, options) => {
    const errors = []
    const endpointErrors = []

    for (const baseUrl of API_BASE_URLS) {
      try {
        const response = await fetch(`${baseUrl}${path}`, options)
        if (response.ok) {
          return response
        }

        const body = await response.text().catch(() => '')
        let parsedBody = null
        if (body) {
          try {
            parsedBody = JSON.parse(body)
          } catch {
            parsedBody = null
          }
        }

        endpointErrors.push({
          endpoint: `${baseUrl}${path}`,
          status: response.status,
          body,
          parsedBody
        })

        errors.push(`${baseUrl}${path} -> ${response.status}${body ? `: ${body}` : ''}`)
      } catch (error) {
        errors.push(`${baseUrl}${path} -> ${error.message}`)
      }
    }

    const combinedError = new Error(`All backend endpoints failed. ${errors.join(' | ')}`)
    combinedError.endpointErrors = endpointErrors

    const backendError = endpointErrors.find(({ parsedBody }) =>
      parsedBody && (parsedBody.provider_status || parsedBody.details || parsedBody.error)
    )

    if (backendError) {
      combinedError.status = backendError.status
      combinedError.backend = backendError.parsedBody
      combinedError.providerStatus = backendError.parsedBody.provider_status
    }

    throw combinedError
  }

  // --- Logic --- (Kept from original)
  const analyzePlantDisease = async (imageData) => {
    try {
      // OPTIMIZATION 1: Check cache first
      const imageHash = getImageHash(imageData)
      const cachedResult = analysisCache.get(imageHash)
      if (cachedResult) {
        console.log('🚀 Using cached analysis result')
        return cachedResult
      }

      // OPTIMIZATION 2: Compress image before sending (reduces payload by 70-85%)
      console.log('📦 Optimizing image for faster processing...')
      const optimizedImage = await optimizeImage(imageData, 1024, 1024, 0.85)
      
      // OPTIMIZATION 3: Send with shorter timeout (optimized images process faster)
      for (let attempt = 1; attempt <= ANALYZE_MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

        try {
          const response = await fetchWithApiFallback('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: optimizedImage }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          const result = await response.json()
          if (result?.is_mock) {
            const mockError = new Error('Backend returned demo fallback data instead of real AI analysis.')
            mockError.providerStatus = result?.provider_status
            mockError.isMock = true
            throw mockError
          }

          // Cache the successful result
          analysisCache.set(imageHash, result)
          console.log('✅ Real-time analysis successful:', result)
          return result
        } catch (error) {
          clearTimeout(timeoutId)
          const timedOut = error?.name === 'AbortError' || error?.name === 'TimeoutError' || String(error?.message || '').includes('signal timed out')
          const isLastAttempt = attempt === ANALYZE_MAX_ATTEMPTS

          if (timedOut && !isLastAttempt) {
            console.warn(`Analysis attempt ${attempt} timed out. Retrying once...`)
            await new Promise((resolve) => setTimeout(resolve, 2000))
            continue
          }

          const backendMessage = error?.backend?.details || error?.backend?.error
          const message = timedOut
            ? 'Backend timed out while analyzing the image. The Render service may be waking up or unavailable. Please wait a moment and try again.'
            : backendMessage || error?.message || 'Analysis failed. Please check backend configuration.'

          console.error('Error calling backend API:', error)
          const normalizedError = new Error(message)
          normalizedError.status = error?.status
          normalizedError.providerStatus = error?.providerStatus || error?.backend?.provider_status
          normalizedError.isMock = Boolean(error?.isMock)
          throw normalizedError
        }
      }
    } catch (error) {
      throw error
    }
  }

  const performAnalysis = async (imageData) => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null) // Clear previous results
    try {
      const result = await analyzePlantDisease(imageData)
      setAnalysisResult(result)
      setScanHistory(prev => [{ ...result, timestamp: new Date(), image: imageData }, ...prev])
      setCurrentPage('analysis') // Navigate to analysis page
    } catch (error) {
      console.error('Analysis failed:', error)
      const providerStatusSummary = formatProviderStatus(error?.providerStatus)
      const bannerMessage = providerStatusSummary
        ? `${error.message} Provider status: ${providerStatusSummary}`
        : error.message

      setAnalysisError(bannerMessage)
      setUploadedImage(null)
      setCurrentPage('analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleImageSelected = (imageData) => {
    console.log('Image selected, starting analysis...')
    setAnalysisError(null)
    setUploadedImage(imageData)
    setCurrentPage('analysis') // Navigate to analysis page immediately
    performAnalysis(imageData)
  }

  const resetAnalysis = () => {
    setUploadedImage(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setIsAnalyzing(false)
  }

  const [isDownloading, setIsDownloading] = useState(false)

  const downloadReport = async (language = 'english') => {
    if (!analysisResult) return
    setIsDownloading(true)
    let timeoutId
    try {
      // Include language in the request
      const reportData = {
        disease: analysisResult.disease,
        description: analysisResult.description,
        remedies: analysisResult.remedies || [],
        confidence: analysisResult.confidence,
        severity: analysisResult.severity,
        plant_name: analysisResult.plant_name,
        seasonal_tips: analysisResult.seasonal_tips || '',
        prescribed_care: analysisResult.prescribed_care || {},
        language: language
      }
      
      const controller = new AbortController()
      // 60 second timeout for complete download
      timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const response = await fetchWithApiFallback('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
        signal: controller.signal
      })
      
      if (!response.ok) {
        clearTimeout(timeoutId)
        throw new Error('Report generation failed')
      }
      
      // Read blob with timeout protection
      const blob = await response.blob()
      clearTimeout(timeoutId)
      
      // Trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plant-health-report-${language}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Download failed:', error)
      const msg = error.name === 'AbortError' ? 'PDF download took too long. Please try again.' : 'Failed to download report. Please try again.'
      alert(msg)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="app-container">
      <div className="app-toolbar">
        <div className="language-toggle" role="group" aria-label="Language selection">
          <button
            onClick={() => setLanguage('english')}
            className={`language-toggle__btn ${language === 'english' ? 'is-active' : ''}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('gujarati')}
            className={`language-toggle__btn ${language === 'gujarati' ? 'is-active' : ''}`}
          >
            ગુ
          </button>
        </div>

        <ThemeToggle isDark={isDark} toggle={toggleTheme} />
      </div>
      
      <Hero language={language} />

      <main className="content-shell">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CareOptions language={language} onNavigate={(page) => {
                if (page === 'analysis') {
                  setCurrentPage('analysis')
                } else if (page === 'basic') {
                  setCurrentPage('basic')
                } else if (page === 'seasonal') {
                  setCurrentPage('seasonal')
                } else if (page === 'environmental') {
                  setCurrentPage('environmental')
                }
              }} />
            </motion.div>
          )}

          {currentPage === 'basic' && (
            <BasicCareTips key="basic" language={language} onBack={() => setCurrentPage('home')} />
          )}

          {currentPage === 'seasonal' && (
            <SeasonalCareTips key="seasonal" language={language} onBack={() => setCurrentPage('home')} />
          )}

          {currentPage === 'environmental' && (
            <WeatherSoilData key="environmental" language={language} onBack={() => setCurrentPage('home')} />
          )}

          {currentPage === 'analysis' && !uploadedImage && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="analysis-back">
                <button className="back-btn" onClick={() => setCurrentPage('home')}>
                  ← {t('backToHome', language)}
                </button>
              </div>

              {analysisError && (
                <div className="analysis-error-banner" role="alert">
                  <p>{analysisError}</p>
                  <button
                    className="analysis-error-banner__dismiss"
                    onClick={() => setAnalysisError(null)}
                    aria-label="Dismiss analysis error"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <UploadZone language={language} onImageSelected={handleImageSelected} />

              <ScanHistory
                history={scanHistory}
                onSelect={(scan) => {
                  setUploadedImage(scan.image)
                  setAnalysisResult(scan)
                }}
              />
            </motion.div>
          )}

          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="analysis-loading"
            >
              <motion.div
                className="analysis-spinner"
                aria-hidden="true"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              />
              <h3>{language === 'gujarati' ? 'નમૂનાનું વિશ્લેષણ ચાલી રહ્યું છે...' : 'Analyzing specimen structure...'}</h3>
              <p>{language === 'gujarati' ? 'બોટાનિકલ ડેટા સાથે તુલના કરી રહ્યા છીએ.' : 'Comparing against botanical archives.'}</p>
            </motion.div>
          )}

          {analysisResult && !isAnalyzing && (
            <AnalysisResults
              key="results"
              result={analysisResult}
              image={uploadedImage}
              language={language}
              isDownloading={isDownloading}
              onReset={() => {
                resetAnalysis()
                setCurrentPage('analysis')
              }}
              onDownload={downloadReport}
              onBack={() => {
                resetAnalysis()
                setCurrentPage('home')
              }}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Plant Health AI. Cultivated with care.</p>
      </footer>
    </div>
  )
}

export default App
