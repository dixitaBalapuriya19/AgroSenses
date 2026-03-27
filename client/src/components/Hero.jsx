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
          <div className="hero-panel hero-panel--flow">
            <h3>{language === 'gujarati' ? 'કેવી રીતે કામ કરે છે' : 'How it works'}</h3>
            <ol className="hero-flow-list">
              <li>
                <strong>{language === 'gujarati' ? 'છબી અપલોડ કરો' : 'Upload a clear image'}</strong>
                <span>
                  {language === 'gujarati'
                    ? 'પાંદડા અથવા દાગવાળા ભાગનો નિકટથી ફોટો લો.'
                    : 'Capture leaf texture and affected area in one frame.'}
                </span>
              </li>
              <li>
                <strong>{language === 'gujarati' ? 'AI વિશ્લેષણ મેળવો' : 'Get AI diagnosis'}</strong>
                <span>
                  {language === 'gujarati'
                    ? 'રોગની ઓળખ, વિશ્વાસ સ્કોર અને ગંભીરતા મેળવો.'
                    : 'Receive disease type, confidence score, and severity.'}
                </span>
              </li>
              <li>
                <strong>{language === 'gujarati' ? 'ચિકિત્સા યોજના અનુસરો' : 'Apply treatment plan'}</strong>
                <span>
                  {language === 'gujarati'
                    ? 'તાત્કાલિક પગલાં, ઋતુવાર માર્ગદર્શન અને PDF રિપોર્ટ મેળવો.'
                    : 'Use instant actions, seasonal guidance, and PDF reports.'}
                </span>
              </li>
            </ol>
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
