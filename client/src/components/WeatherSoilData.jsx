import { useState, useEffect } from 'react'
import { t } from '../translations'
import { API_BASE_URL } from '../config/api'
import { WarningIcon, WeatherIcon, SoilIcon, ClipboardIcon, CheckCircleIcon, DropletIcon, ThermometerIcon, CloudRainIcon, FlaskIcon, SeedlingIcon, LightbulbIcon } from './Icons'

const WeatherSoilData = ({ onBack, language = 'english' }) => {
  const [weatherData, setWeatherData] = useState(null)
  const [soilData, setSoilData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Helper component for recommendation icons
  const RecommendationIcon = ({ type, children }) => {
    const icons = {
      warning: <WarningIcon size={18} color="var(--color-warning)" />,
      success: <CheckCircleIcon size={18} color="var(--color-success)" />,
      advice: <LightbulbIcon size={18} color="var(--color-info)" />
    };
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ marginTop: '2px', flexShrink: 0 }}>{icons[type]}</span>
        <span>{children}</span>
      </div>
    );
  }

  const location = 'Rajkot, Gujarat' // Default location

  useEffect(() => {
    fetchEnvironmentalData()
  }, [location])

  const fetchEnvironmentalData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch weather data from backend
      await fetchWeatherData()
      // Fetch soil data from backend
      await fetchSoilData()
    } catch (err) {
      console.error('Error fetching environmental data:', err)
      setError('Failed to load environmental data')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/environment/weather?location=${encodeURIComponent(location)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setWeatherData({
          temperature: data.temperature,
          feels_like: data.feels_like,
          humidity: data.humidity,
          description: data.description,
          windSpeed: data.wind_speed,
          rainfall: data.rainfall,
          cloudiness: data.cloudiness,
          pressure: data.pressure,
          sunrise: data.sunrise,
          sunset: data.sunset
        })
      } else {
        throw new Error('Weather API request failed')
      }
    } catch (error) {
      console.error('Weather API error:', error)
      // Fallback mock data
      setWeatherData({
        temperature: 28,
        humidity: 65,
        description: 'Partly cloudy',
        windSpeed: 12,
        rainfall: 0,
        feels_like: 30,
        cloudiness: 40,
        pressure: 1013
      })
    }
  }

  const fetchSoilData = async () => {
    try {
      // You can add lat/lon parameters if user provides location
      const response = await fetch(`${API_BASE_URL}/environment/soil`)
      
      if (response.ok) {
        const data = await response.json()
        setSoilData({
          ph: data.ph,
          nitrogen: data.nitrogen,
          phosphorus: data.phosphorus,
          potassium: data.potassium,
          organicMatter: data.organic_matter,
          texture: data.texture,
          moisture: data.moisture,
          source: data.source
        })
      } else {
        throw new Error('Soil API request failed')
      }
    } catch (error) {
      console.error('Soil API error:', error)
      // Fallback mock data
      setSoilData({
        ph: 6.8,
        nitrogen: 'Medium',
        phosphorus: 'High',
        potassium: 'Medium',
        organicMatter: '2.1%',
        texture: 'Clay Loam',
        moisture: '45%',
        source: 'Fallback Data'
      })
    }
  }

  if (loading) {
    return (
      <div className="weather-soil-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading environmental data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="weather-soil-container">
        <div className="analysis-back">
          <button className="back-btn" onClick={onBack}>
            ← Back to Home
          </button>
        </div>
        <div className="error-message">
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <WarningIcon size={20} color="var(--color-warning)" />
            {error}
          </p>
          <button onClick={fetchEnvironmentalData} className="retry-btn">
            {language === 'gujarati' ? 'ફરી પ્રયાસ કરો' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="weather-soil-container">
      <div className="analysis-back">
        <button className="back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
      <h3>🌍 Environmental Conditions</h3>
      
      <div className="data-grid">
        <div className="weather-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WeatherIcon size={20} color="var(--color-gold)" />
            {language === 'gujarati' ? 'હવામાન' : 'Weather'}
          </h4>
          {weatherData && (
            <div className="weather-details">
              <div className="weather-item">
                <span className="label">{t('temperature', language)}:</span>
                <span className="value">{weatherData.temperature}°C</span>
              </div>
              <div className="weather-item">
                <span className="label">{language === 'gujarati' ? 'લાગે છે' : 'Feels Like'}:</span>
                <span className="value">{weatherData.feels_like}°C</span>
              </div>
              <div className="weather-item">
                <span className="label">{t('humidity', language)}:</span>
                <span className="value">{weatherData.humidity}%</span>
              </div>
              <div className="weather-item">
                <span className="label">{language === 'gujarati' ? 'પરિસ્થિતિઓ' : 'Conditions'}:</span>
                <span className="value">{weatherData.description}</span>
              </div>
              <div className="weather-item">
                <span className="label">{t('windSpeed', language)}:</span>
                <span className="value">{weatherData.windSpeed} km/h</span>
              </div>
              <div className="weather-item">
                <span className="label">{language === 'gujarati' ? 'દબાણ' : 'Pressure'}:</span>
                <span className="value">{weatherData.pressure} hPa</span>
              </div>
              {weatherData.rainfall > 0 && (
                <div className="weather-item">
                  <span className="label">{language === 'gujarati' ? 'તાજેતરનો વરસાદ' : 'Recent Rainfall'}:</span>
                  <span className="value">{weatherData.rainfall}mm</span>
                </div>
              )}
              {weatherData.sunrise && (
                <>
                  <div className="weather-item">
                    <span className="label">{language === 'gujarati' ? 'સૂર્યોદય' : 'Sunrise'}:</span>
                    <span className="value">{weatherData.sunrise}</span>
                  </div>
                  <div className="weather-item">
                    <span className="label">{language === 'gujarati' ? 'સૂર્યાસ્ત' : 'Sunset'}:</span>
                    <span className="value">{weatherData.sunset}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="soil-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SoilIcon size={20} color="var(--color-moss-deep)" />
            {language === 'gujarati' ? 'માટીની સ્વાસ્થ્ય' : 'Soil Health'}
          </h4>
          {soilData && (
            <div className="soil-details">
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'પીએચ સ્તર' : 'pH Level'}:</span>
                <span className="value">{soilData.ph}</span>
              </div>
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'નાઇટ્રોજન' : 'Nitrogen'}:</span>
                <span className="value">{soilData.nitrogen}</span>
              </div>
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'ફોસ્ફરસ' : 'Phosphorus'}:</span>
                <span className="value">{soilData.phosphorus}</span>
              </div>
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'પોટેશિયમ' : 'Potassium'}:</span>
                <span className="value">{soilData.potassium}</span>
              </div>
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'માટીનો પ્રકાર' : 'Soil Type'}:</span>
                <span className="value">{soilData.texture}</span>
              </div>
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'કાર્બનિક પદાર્થ' : 'Organic Matter'}:</span>
                <span className="value">{soilData.organicMatter}</span>
              </div>
              <div className="soil-item">
                <span className="label">{language === 'gujarati' ? 'ભેજ' : 'Moisture'}:</span>
                <span className="value">{soilData.moisture}</span>
              </div>
              {soilData.source && (
                <div className="soil-item source-info">
                  <span className="label">{language === 'gujarati' ? 'ડેટા સ્રોત' : 'Data Source'}:</span>
                  <span className="value">{soilData.source}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="recommendations">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardIcon size={20} color="var(--color-clay)" />
          {language === 'gujarati' ? 'કૃષિ ભલામણો' : 'Agricultural Recommendations'}
        </h4>
        <div className="recommendation-list">
          {/* Weather-based recommendations */}
          {weatherData && weatherData.humidity > 70 && (
            <div className="recommendation warning">
              <RecommendationIcon type="warning">
                {language === 'gujarati' 
                  ? `ઊંચી ભેજ (${weatherData.humidity}%) - ફંગલ રોગોનું જોખમ વધારે. સારું હવા પરિભ્રમણ સુનિશ્ચિત કરો અને ઉપરથી પાણી આપવાનું ટાળો.`
                  : `High humidity (${weatherData.humidity}%) - Increased risk of fungal diseases. Ensure good air circulation and avoid overhead watering.`
                }
              </RecommendationIcon>
            </div>
          )}
          {weatherData && weatherData.humidity >= 50 && weatherData.humidity <= 70 && (
            <div className="recommendation success">
              <RecommendationIcon type="success">
                {language === 'gujarati'
                  ? `શ્રેષ્ઠ ભેજ (${weatherData.humidity}%) - મોટાભાગના પાકો માટે સારી પરિસ્થિતિઓ. વર્તમાન સિંચાઈ શેડ્યૂલ જાળવો.`
                  : `Optimal humidity (${weatherData.humidity}%) - Good conditions for most crops. Maintain current irrigation schedule.`
                }
              </RecommendationIcon>
            </div>
          )}
          {weatherData && weatherData.humidity < 50 && (
            <div className="recommendation advice">
              <RecommendationIcon type="advice">
                {language === 'gujarati'
                  ? `ઓછી ભેજ (${weatherData.humidity}%) - માટીની ભેજ જાળવવા માટે મલ્ચિંગ પર વિચાર કરો અને પાણીની આવર્તન વધારો.`
                  : `Low humidity (${weatherData.humidity}%) - Consider mulching to retain soil moisture and increase watering frequency.`
                }
              </RecommendationIcon>
            </div>
          )}
          
          {weatherData && weatherData.temperature > 35 && (
            <div className="recommendation warning">
              <RecommendationIcon type="warning">
                {language === 'gujarati'
                  ? `ઊંચું તાપમાન (${weatherData.temperature}°C) - પૂરતી સિંચાઈ સુનિશ્ચિત કરો, સંવેદનશીલ પાકો માટે છાયા જાળી પર વિચાર કરો.`
                  : `High temperature (${weatherData.temperature}°C) - Ensure adequate irrigation, consider shade nets for sensitive crops.`
                }
              </RecommendationIcon>
            </div>
          )}
          {weatherData && weatherData.temperature >= 20 && weatherData.temperature <= 35 && (
            <div className="recommendation success">
              <RecommendationIcon type="success">
                {language === 'gujarati'
                  ? `આદર્શ તાપમાન (${weatherData.temperature}°C) - મોટાભાગના પાકો માટે ઉત્તમ વૃદ્ધિની પરિસ્થિતિઓ.`
                  : `Ideal temperature (${weatherData.temperature}°C) - Excellent growing conditions for most crops.`
                }
              </RecommendationIcon>
            </div>
          )}
          {weatherData && weatherData.temperature < 20 && (
            <div className="recommendation advice">
              <RecommendationIcon type="advice">
                {language === 'gujarati'
                  ? `ઠંડું તાપમાન (${weatherData.temperature}°C) - હિમથી સંવેદનશીલ છોડને સુરક્ષિત કરો, ઠંડી-મોસમના પાકો માટે આદર્શ.`
                  : `Cool temperature (${weatherData.temperature}°C) - Protect frost-sensitive plants, ideal for cool-season crops.`
                }
              </RecommendationIcon>
            </div>
          )}

          {weatherData && weatherData.rainfall > 0 && (
            <div className="recommendation advice">
              <RecommendationIcon type="advice">
                {language === 'gujarati'
                  ? `તાજેતરનો વરસાદ (${weatherData.rainfall}mm) - સિંચાઈ ઘટાડો, પાણી ભરાવા માટે નિરીક્ષણ કરો.`
                  : `Recent rainfall (${weatherData.rainfall}mm) - Reduce irrigation, monitor for waterlogging.`
                }
              </RecommendationIcon>
            </div>
          )}

          {/* Soil-based recommendations */}
          {soilData && soilData.ph < 6.0 && (
            <div className="recommendation warning">
              <RecommendationIcon type="warning">
                {language === 'gujarati'
                  ? `એસિડિક માટી (pH ${soilData.ph}) - મોટાભાગના પાકો માટે pH વધારવા માટે ચૂનો ઉમેરો. બ્લૂબેરી જેવા એસિડ-પ્રેમી છોડ માટે આદર્શ.`
                  : `Acidic soil (pH ${soilData.ph}) - Add lime to raise pH for most crops. Ideal for acid-loving plants like blueberries.`
                }
              </RecommendationIcon>
            </div>
          )}
          {soilData && soilData.ph >= 6.0 && soilData.ph <= 7.5 && (
            <div className="recommendation success">
              <RecommendationIcon type="success">
                {language === 'gujarati'
                  ? `શ્રેષ્ઠ pH (${soilData.ph}) - મોટાભાગના પાકો માટે સંપૂર્ણ શ્રેણી. કાર્બનિક પદાર્થ સાથે જાળવો.`
                  : `Optimal pH (${soilData.ph}) - Perfect range for most crops. Maintain with organic matter.`
                }
              </RecommendationIcon>
            </div>
          )}
          {soilData && soilData.ph > 7.5 && (
            <div className="recommendation advice">
              <RecommendationIcon type="advice">
                {language === 'gujarati'
                  ? `આલ્કલાઈન માટી (pH ${soilData.ph}) - જરૂર હોય તો pH ઘટાડવા માટે સલ્ફર અથવા કાર્બનિક પદાર્થ ઉમેરો.`
                  : `Alkaline soil (pH ${soilData.ph}) - Add sulfur or organic matter to lower pH if needed.`
                }
              </RecommendationIcon>
            </div>
          )}

          {soilData && soilData.nitrogen === 'Low' && (
            <div className="recommendation warning">
              <RecommendationIcon type="warning">
                {language === 'gujarati'
                  ? `ઓછું નાઇટ્રોજન - પાંદડાની વૃદ્ધિ વધારવા માટે નાઇટ્રોજન-સમૃદ્ધ ખાતર (યુરિયા, ખાતર) લાગુ કરો.`
                  : `Low nitrogen - Apply nitrogen-rich fertilizer (urea, compost) to boost leafy growth.`
                }
              </RecommendationIcon>
            </div>
          )}
          {soilData && soilData.nitrogen === 'Medium' && (
            <div className="recommendation success">
              <RecommendationIcon type="success">
                {language === 'gujarati'
                  ? `પૂરતું નાઇટ્રોજન - નિયમિત ખાતર ઉમેરવાથી અને પાક પરિભ્રમણથી જાળવો.`
                  : `Adequate nitrogen - Maintain with regular compost additions and crop rotation.`
                }
              </RecommendationIcon>
            </div>
          )}
          {soilData && soilData.nitrogen === 'High' && (
            <div className="recommendation advice">
              <RecommendationIcon type="advice">
                {language === 'gujarati'
                  ? `ઊંચું નાઇટ્રોજન - પાંદડાવાળા શાકભાજી માટે ઉત્તમ. વધુ પડતું ખાતર ટાળો.`
                  : `High nitrogen - Excellent for leafy vegetables. Avoid over-fertilization.`
                }
              </RecommendationIcon>
            </div>
          )}

          {soilData && soilData.phosphorus === 'Low' && (
            <div className="recommendation warning">
              <RecommendationIcon type="warning">
                {language === 'gujarati'
                  ? `ઓછું ફોસ્ફરસ - મૂળના વિકાસ અને ફૂલ માટે બોન મીલ અથવા રોક ફોસ્ફેટ લાગુ કરો.`
                  : `Low phosphorus - Apply bone meal or rock phosphate for root development and flowering.`
                }
              </RecommendationIcon>
            </div>
          )}
          {soilData && soilData.phosphorus === 'High' && (
            <div className="recommendation success">
              <RecommendationIcon type="success">
                {language === 'gujarati'
                  ? `સારા ફોસ્ફરસ સ્તર - મજબૂત મૂળ સિસ્ટમ્સ અને ફૂલ/ફળ ઉત્પાદનને સમર્થન આપે છે.`
                  : `Good phosphorus levels - Supports strong root systems and flower/fruit production.`
                }
              </RecommendationIcon>
            </div>
          )}

          {soilData && soilData.potassium === 'Low' && (
            <div className="recommendation warning">
              <RecommendationIcon type="warning">
                {language === 'gujarati'
                  ? `ઓછું પોટેશિયમ - રોગ પ્રતિકાર અને ફળની ગુણવત્તા માટે પોટાશ અથવા લાકડાની રાખ ઉમેરો.`
                  : `Low potassium - Add potash or wood ash for disease resistance and fruit quality.`
                }
              </RecommendationIcon>
            </div>
          )}
          {soilData && soilData.potassium === 'Medium' && (
            <div className="recommendation success">
              <RecommendationIcon type="success">
                {language === 'gujarati'
                  ? `સંતુલિત પોટેશિયમ - એકંદર છોડની સ્વાસ્થ્ય અને તાણ સહનશક્તિને સમર્થન આપે છે.`
                  : `Balanced potassium - Supports overall plant health and stress tolerance.`
                }
              </RecommendationIcon>
            </div>
          )}

          {soilData && soilData.texture && (
            <div className="recommendation advice">
              <RecommendationIcon type="advice">
                {soilData.texture} {language === 'gujarati' ? 'માટી' : 'soil'} - {
                  soilData.texture.includes('Clay') 
                    ? (language === 'gujarati' 
                      ? 'સારું પાણી જળવાણી. ડ્રેનેજ અને વાયુમિશ્રણ સુધારવા માટે કાર્બનિક પદાર્થ ઉમેરો.' 
                      : 'Good water retention. Add organic matter to improve drainage and aeration.') 
                    : soilData.texture.includes('Sand')
                    ? (language === 'gujarati'
                      ? 'ઉત્તમ ડ્રેનેજ. પાણી જળવાણી અને પોષક તત્વો સુધારવા માટે ખાતર ઉમેરો.'
                      : 'Excellent drainage. Add compost to improve water retention and nutrients.')
                    : (language === 'gujarati'
                      ? 'સંતુલિત રચના. નિયમિત કાર્બનિક સુધારણા સાથે મોટાભાગના પાકો માટે આદર્શ.'
                      : 'Balanced texture. Ideal for most crops with regular organic amendments.')
                }
              </RecommendationIcon>
            </div>
          )}

          {/* General seasonal recommendation */}
          <div className="recommendation advice">
            <RecommendationIcon type="advice">
              {language === 'gujarati'
                ? 'સામાન્ય ટીપ: આવતા આબોહવા પરિવર્તનના આધારે હવામાન પેટર્ન નિયમિતપણે નીરીક્ષણ કરો અને સિંચાઈ સમાયોજિત કરો. ભેજ સંરક્ષિત કરવા અને નીંદણ દમન કરવા માટે મલ્ચ.ો'
                : 'General Tip: Monitor weather patterns regularly and adjust irrigation based on upcoming conditions. Mulch to conserve moisture and suppress weeds.'
              }
            </RecommendationIcon>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeatherSoilData
