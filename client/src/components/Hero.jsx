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
          <div className="hero-panel hero-panel--ops">
            <div className="hero-ops-head">
              <h3>{language === 'gujarati' ? 'સ્માર્ટ કેર ડેશબોર્ડ' : 'Smart Care Dashboard'}</h3>
              <span>{language === 'gujarati' ? 'લાઇવ મોડ્યુલ્સ' : 'Live modules'}</span>
            </div>

            <div className="hero-ops-grid">
              <article className="hero-ops-tile">
                <h4>{language === 'gujarati' ? 'AI નિદાન' : 'AI Diagnosis'}</h4>
                <p>{language === 'gujarati' ? 'રોગ, ગંભીરતા અને વિશ્વાસ સ્કોર' : 'Disease, severity, and confidence scoring'}</p>
              </article>
              <article className="hero-ops-tile">
                <h4>{language === 'gujarati' ? 'પર્યાવરણીય ડેટા' : 'Environmental Data'}</h4>
                <p>{language === 'gujarati' ? 'હવામાન + માટીથી સંદર્ભિત નિર્ણય' : 'Weather + soil contextual decisioning'}</p>
              </article>
              <article className="hero-ops-tile">
                <h4>{language === 'gujarati' ? 'ઋતુવાર વ્યૂહરચના' : 'Seasonal Strategy'}</h4>
                <p>{language === 'gujarati' ? 'મોસમ અનુસાર કાળજી અને જોખમ દેખરેખ' : 'Season-specific care and risk watchouts'}</p>
              </article>
              <article className="hero-ops-tile">
                <h4>{language === 'gujarati' ? 'રિપોર્ટિંગ' : 'Reporting'}</h4>
                <p>{language === 'gujarati' ? 'એક-ક્લિક English PDF હેલ્થ રિપોર્ટ' : 'One-click English PDF health report'}</p>
              </article>
            </div>

            <div className="hero-ops-strip" aria-label="care execution flow">
              <div>
                <strong>{language === 'gujarati' ? 'કૅપ્ચર' : 'Capture'}</strong>
                <span>{language === 'gujarati' ? 'સ્પષ્ટ છબી અપલોડ કરો' : 'Upload a clear specimen image'}</span>
              </div>
              <div>
                <strong>{language === 'gujarati' ? 'વિશ્લેષણ' : 'Analyze'}</strong>
                <span>{language === 'gujarati' ? 'AIથી મૂળ કારણ મેળવો' : 'Get AI root-cause insights'}</span>
              </div>
              <div>
                <strong>{language === 'gujarati' ? 'ક્રિયા' : 'Act'}</strong>
                <span>{language === 'gujarati' ? 'તાત્કાલિક યોજના અમલમાં મૂકો' : 'Apply treatment and prevention plan'}</span>
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
