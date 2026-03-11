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
import VoiceAssistant from './components/VoiceAssistant'
import WeatherSoilData from './components/WeatherSoilData'
import { API_BASE_URL } from './config/api'
import { t } from './translations'

function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState('home') // 'home', 'basic', 'seasonal', 'analysis', 'environmental'

  // State
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
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

  // --- Logic --- (Kept from original)
  const analyzePlantDisease = async (imageData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Backend error ${response.status}:`, errorText)
        throw new Error(`Backend error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Real-time analysis successful:', result)
      return result
    } catch (error) {
      console.error('Error calling backend API:', error)
      alert(`Analysis failed: ${error.message}. Please check that the backend API is reachable.`)
      throw error // Don't fallback to mock data, throw error instead
    }
  }

  // Generate deterministic hash from image data for consistent results
  const hashImageData = (imageData) => {
    let hash = 0
    for (let i = 0; i < imageData.length; i++) {
      const char = imageData.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  const generateMockResult = (imageData) => {
    const mockDiseases = [
      {
        disease: 'Powdery Mildew',
        confidence: 92,
        severity: 'high',
        description: 'Fungal infection causing white powder-like coating on leaves. Common in humid environments with poor air circulation.',
        plant_name: 'Rosa (Rose)',
        seasonal_tips: 'In spring, prune back dead wood to encourage vigorous new growth and better airflow.',
        remedies: [
          { step: 1, action: 'Remove infected leaves immediately', timeframe: 'Now', effectiveness: 95 },
          { step: 2, action: 'Apply neem oil spray', timeframe: 'Every 7 days', effectiveness: 88 },
          { step: 3, action: 'Improve air circulation around plant', timeframe: 'Ongoing', effectiveness: 92 },
        ],
        prescribed_care: {
          overview: 'Powdery mildew is a fungal disease that thrives in warm, dry conditions with poor air circulation. Recovery requires immediate action and consistent treatment.',
          immediate_actions: [
            'Isolate the affected plant from other plants to prevent spread',
            'Remove all visibly infected leaves using sterilized scissors',
            'Dispose of infected leaves in sealed bags (do not compost)',
            'Wash your hands and sterilize tools after handling the plant'
          ],
          treatment_schedule: [
            { week: 'Week 1-2', actions: 'Apply neem oil or sulfur dust every 7 days. Monitor for new infections daily.' },
            { week: 'Week 3-4', actions: 'Continue spraying every 10 days. Prune away crowded branches for better airflow.' },
            { week: 'Week 5+', actions: 'Reduce spray frequency to every 14 days once no new signs appear for 2 weeks.' }
          ],
          environmental_improvements: [
            'Increase air circulation with a small fan (not directly on plant)',
            'Reduce humidity to 40-50% using a dehumidifier if needed',
            'Water only at soil level, never wet the foliage',
            'Space plants 6-12 inches apart to allow airflow',
            'Ensure temperatures stay between 65-75°F'
          ],
          prevention: [
            'Water in the morning so foliage dries quickly',
            'Prune regularly to maintain open canopy structure',
            'Avoid overcrowding plants in confined spaces',
            'Monitor new growth weekly for early detection',
            'Apply preventative neem oil spray monthly during growing season'
          ]
        }
      },
      {
        disease: 'Leaf Spot',
        confidence: 85,
        severity: 'medium',
        description: 'Bacterial or fungal infection causing dark spots with halos. Often caused by overhead watering.',
        plant_name: 'Monstera Deliciosa',
        seasonal_tips: 'Reduce watering frequency in winter as the plant enters dormancy.',
        remedies: [
          { step: 1, action: 'Isolate plant from others', timeframe: 'Immediately', effectiveness: 100 },
          { step: 2, action: 'Prune affected areas', timeframe: 'Within 24h', effectiveness: 93 },
          { step: 3, action: 'Water only at soil level', timeframe: 'Forever', effectiveness: 90 },
        ],
        prescribed_care: {
          overview: 'Leaf spot is typically caused by fungal or bacterial pathogens that spread through water splash. Correcting watering habits is critical to recovery.',
          immediate_actions: [
            'Separate the plant from nearby plants immediately',
            'Prune all leaves with dark spots and yellow halos',
            'Remove leaves that are more than 30% affected',
            'Sterilize pruning tools between cuts using rubbing alcohol'
          ],
          treatment_schedule: [
            { week: 'Week 1', actions: 'Apply copper fungicide or bactericide spray. Spray every 7-10 days for 4 weeks.' },
            { week: 'Week 2-4', actions: 'Monitor new leaf growth closely. Continue spraying and improve ventilation.' },
            { week: 'Week 5+', actions: 'If no new spots appear for 3 weeks, reduce spray frequency to every 2 weeks.' }
          ],
          environmental_improvements: [
            'Switch to bottom watering only (water from below the pot)',
            'Never wet leaves during watering',
            'Ensure humidity stays below 60%',
            'Provide good air circulation with a small fan',
            'Keep plant away from water-splashing areas'
          ],
          prevention: [
            'Always water at the base of the plant, never overhead',
            'Use room-temperature water (cold water increases infection risk)',
            'Empty drainage saucers within 15 minutes of watering',
            'Remove fallen leaves immediately',
            'Wipe leaves with dry cloth to maintain dry foliage'
          ]
        }
      }
    ]
    // Use image hash to deterministically select a disease
    const hash = imageData ? hashImageData(imageData) : 0
    return mockDiseases[hash % mockDiseases.length]
  }

  const performAnalysis = async (imageData) => {
    setIsAnalyzing(true)
    setAnalysisResult(null) // Clear previous results
    try {
      const result = await analyzePlantDisease(imageData)
      setAnalysisResult(result)
      setScanHistory(prev => [{ ...result, timestamp: new Date(), image: imageData }, ...prev])
      setCurrentPage('analysis') // Navigate to analysis page
    } catch (error) {
      console.error('Analysis failed:', error)
      setIsAnalyzing(false)
      setCurrentPage('home') // Go back to home on error
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleImageSelected = (imageData) => {
    console.log('Image selected, starting analysis...')
    setUploadedImage(imageData)
    setCurrentPage('analysis') // Navigate to analysis page immediately
    performAnalysis(imageData)
  }

  const resetAnalysis = () => {
    setUploadedImage(null)
    setAnalysisResult(null)
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
      
      const response = await fetch(`${API_BASE_URL}/report`, {
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
      <ThemeToggle isDark={isDark} toggle={toggleTheme} />
      
      {/* Language Selector */}
      <div style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        backgroundColor: 'var(--color-bg)',
        padding: '8px 12px',
        borderRadius: '999px',
        boxShadow: 'var(--shadow-soft)',
        border: '1px solid var(--color-stone-light)'
      }}>
        <button
          onClick={() => setLanguage('english')}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: language === 'english' ? 'var(--color-moss-deep)' : 'transparent',
            color: language === 'english' ? 'white' : 'var(--color-moss-deep)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          🇬🇧 EN
        </button>
        <button
          onClick={() => setLanguage('gujarati')}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: language === 'gujarati' ? 'var(--color-moss-deep)' : 'transparent',
            color: language === 'gujarati' ? 'white' : 'var(--color-moss-deep)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          🇮🇳 ગુ
        </button>
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
                <VoiceAssistant 
                  language={language} 
                  onResult={(transcript) => {
                    console.log('Voice input:', transcript)
                    // Process voice commands
                    const command = transcript.toLowerCase()
                    if (command.includes('analyze') || command.includes('check') || command.includes('diagnose')) {
                      // Navigate to analysis page
                      setCurrentPage('analysis')
                    } else if (command.includes('weather') || command.includes('environmental')) {
                      setCurrentPage('environmental')
                    } else if (command.includes('home') || command.includes('back')) {
                      setCurrentPage('home')
                    } else if (command.includes('basic') || command.includes('care')) {
                      setCurrentPage('basic')
                    } else if (command.includes('seasonal')) {
                      setCurrentPage('seasonal')
                    }
                  }} 
                  isAnalyzing={isAnalyzing}
                />
              </div>
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
              style={{
                textAlign: 'center',
                padding: 'var(--space-2xl)',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div className="botanical-spinner" style={{ marginBottom: 'var(--space-md)' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{ fontSize: '3rem' }}
                >
                  ✤
                </motion.div>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-moss-deep)' }}>
                Analyzing Specimen Structure...
              </h3>
              <p>Comparing against botanical archives.</p>
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

      <footer style={{
        textAlign: 'center',
        padding: 'var(--space-xl)',
        marginTop: 'auto',
        color: 'var(--color-moss-light)',
        fontSize: 'var(--text-small)',
        borderTop: '1px solid rgba(44,62,46,0.1)'
      }}>
        <p>© {new Date().getFullYear()} Plant Health AI. Cultivated with care.</p>
      </footer>
    </div>
  )
}

export default App
