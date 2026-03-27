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
          <div className="hero-panel hero-panel--illustration">
            <div className="botanical-illustration" role="img" aria-label="Botanical illustration">
              <div className="bio-sun" />
              <div className="bio-hill bio-hill--back" />
              <div className="bio-hill bio-hill--front" />

              <div className="bio-sensor bio-sensor--soil">
                <span>{language === 'gujarati' ? 'માટી' : 'Soil'}</span>
              </div>
              <div className="bio-sensor bio-sensor--climate">
                <span>{language === 'gujarati' ? 'હવામાન' : 'Climate'}</span>
              </div>

              <div className="bio-plant">
                <div className="bio-stem" />
                <div className="bio-leaf bio-leaf--left" />
                <div className="bio-leaf bio-leaf--right" />
                <div className="bio-leaf bio-leaf--top" />
              </div>

              <svg className="bio-wave" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,70 C45,45 90,95 135,70 C180,45 225,95 300,65" />
                <path d="M0,88 C50,63 95,110 140,84 C185,58 230,108 300,80" />
              </svg>
            </div>

            <div className="bio-caption-row">
              <div className="bio-caption-chip">
                <strong>{language === 'gujarati' ? 'લાઇવ ઇનપુટ' : 'Live Inputs'}</strong>
                <span>{language === 'gujarati' ? 'છબી + હવામાન + માટી' : 'Image + Weather + Soil'}</span>
              </div>
              <div className="bio-caption-chip">
                <strong>{language === 'gujarati' ? 'બુદ્ધિશાળી આઉટપુટ' : 'Smart Output'}</strong>
                <span>{language === 'gujarati' ? 'નિદાન + સારવાર યોજના' : 'Diagnosis + Care Plan'}</span>
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
