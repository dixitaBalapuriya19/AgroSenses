import PropTypes from 'prop-types'
import { t } from '../translations'
import { PlantIcon, AutumnIcon, GlobeIcon, SearchIcon } from './Icons'
import PlantShader from './PlantShader'

export default function Hero({ language = 'english', isDark = false, onNavigate }) {
  const features = [
    { id: 'analysis', titleKey: 'instantDiagnosis', descKey: 'instantDiagnosisDesc', Icon: SearchIcon },
    { id: 'basic', titleKey: 'fundamentalCare', descKey: 'fundamentalCareDesc', Icon: PlantIcon },
    { id: 'seasonal', titleKey: 'seasonalGuidance', descKey: 'seasonalGuidanceDesc', Icon: AutumnIcon },
    { id: 'environmental', titleKey: 'environmentalInsights', descKey: 'environmentalInsightsDesc', Icon: GlobeIcon }
  ]

  return (
    <section className="hero-landing">
      <div className="hero-landing__shader-bg">
        <PlantShader isDark={isDark} />
      </div>

      <div className="hero-landing__inner">
        <div className="hero-landing__content">
          <h1>
            {language === 'gujarati' ? 'છોડના રોગનું\nનિદાન કરો' : 'Diagnose with\nPlant Health AI'}
          </h1>
          <p>
            {language === 'gujarati'
              ? 'AI-સંચાલિત રોગ શોધ અને છોડની સંભાળ. તમારા છોડના સ્વાસ્થ્ય માટે બુદ્ધિશાળી સાધન.'
              : 'Integrate AI-powered disease identification into your plant care routine and get instant diagnosis with treatment plans.'}
          </p>

          <div className="hero-actions">
            <button className="hero-action hero-action--primary" onClick={() => onNavigate('analysis')}>
              {language === 'gujarati' ? 'હમણાં નિદાન શરૂ કરો' : 'Start Diagnosis'}
            </button>
            <button className="hero-action" onClick={() => onNavigate('basic')}>
              {language === 'gujarati' ? 'મૂળભૂત સંભાળ માર્ગદર્શિકા' : 'View Care Guide'}
            </button>
          </div>

          <div className="hero-features">
            {features.map((f) => (
              <button
                key={f.id}
                className="hero-feature hero-feature--clickable"
                onClick={() => onNavigate(f.id)}
              >
                <span className="hero-feature__icon">
                  <f.Icon size={20} color="currentColor" />
                </span>
                <div>
                  <h4>{t(f.titleKey, language)}</h4>
                  <p>{t(f.descKey, language)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="hero-landing__visual" aria-label="Plant health workflow">
          <div className="hero-panel hero-panel--isometric">
            <div className="iso-scene" role="img" aria-label="3D plant intelligence illustration">
              <div className="iso-floor" />

              <div className="iso-tile iso-tile--weather">
                <h4>{language === 'gujarati' ? 'હવામાન' : 'Weather'}</h4>
              </div>
              <div className="iso-tile iso-tile--soil">
                <h4>{language === 'gujarati' ? 'માટી' : 'Soil'}</h4>
              </div>

              <div className="iso-pot">
                <div className="iso-pot-top" />
                <div className="iso-pot-front" />
                <div className="iso-pot-side" />

                <div className="iso-stem" />
                <div className="iso-leaf iso-leaf--left" />
                <div className="iso-leaf iso-leaf--right" />
                <div className="iso-leaf iso-leaf--top" />
              </div>

              <div className="iso-pulse iso-pulse--one" />
              <div className="iso-pulse iso-pulse--two" />

              <div className="iso-tag iso-tag--ai">AI</div>
              <div className="iso-tag iso-tag--care">{language === 'gujarati' ? 'કેર' : 'CARE'}</div>
            </div>

            <div className="iso-caption-grid">
              <div className="iso-caption">
                <strong>{language === 'gujarati' ? 'ઇનપુટ' : 'Input Layer'}</strong>
                <p>{language === 'gujarati' ? 'છબી + હવામાન + માટી' : 'Image + Weather + Soil'}</p>
              </div>
              <div className="iso-caption">
                <strong>{language === 'gujarati' ? 'આઉટપુટ' : 'Output Layer'}</strong>
                <p>{language === 'gujarati' ? 'નિદાન + સારવાર યોજના' : 'Diagnosis + Treatment Plan'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

Hero.propTypes = {
  language: PropTypes.string,
  isDark: PropTypes.bool,
  onNavigate: PropTypes.func.isRequired
}
