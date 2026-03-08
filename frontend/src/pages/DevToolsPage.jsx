import { useState, useEffect } from 'react';
import { createIncident, createFallbackIncident, fetchModelConfig, setModelConfig, fetchMetrics, toggleOfflineMode, upgradeAllToAI } from '../api';
import { useToast } from '../components/Toast';
import { ZONES } from '../utils/constants';

const DEMO_SCENARIOS = [
  {
    label: 'Phishing Scam',
    text: 'URGENT! There has been a phishing scam reported in Sector 3. Someone received a suspicious email claiming to be from the local utility company asking for account credentials. NOT A DRILL! SHARE BEFORE THEY DELETE THIS!!!',
    zone: 'Sector 3',
  },
  {
    label: 'Gas Leak',
    text: 'There is a strong gas smell coming from the construction site near Oak Street. Multiple residents have called it in. Fire department is on its way.',
    zone: 'Sector 1',
  },
  {
    label: 'Network Breach',
    text: 'Our neighborhood WiFi network was compromised last night. Several residents noticed unusual login attempts on their accounts. The router firmware may have a vulnerability.',
    zone: 'Sector 5',
  },
  {
    label: 'Noise (should filter)',
    text: 'Ugh, my neighbor is playing music too loud again. This is so annoying. I hate living here sometimes. Nothing ever gets done about noise complaints.',
    zone: 'Sector 2',
  },
];

export default function DevToolsPage() {
  const [modelConfig, setModelConfigState] = useState(null);
  const [metrics, setMetricsState] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [customText, setCustomText] = useState('');
  const [customZone, setCustomZone] = useState('Sector 1');
  const [aiResult, setAiResult] = useState(null);
  const [regexResult, setRegexResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [regexLoading, setRegexLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    fetchModelConfig().then(setModelConfigState).catch(() => {});
    fetchMetrics().then(setMetricsState).catch(() => {});
  }, []);

  const refreshMetrics = () => fetchMetrics().then(setMetricsState).catch(() => {});

  const getText = () => customText || DEMO_SCENARIOS[selectedScenario].text;
  const getZone = () => customText ? customZone : DEMO_SCENARIOS[selectedScenario].zone;

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await createIncident({ raw_text: getText(), location_zone: getZone() });
      setAiResult(result);
      refreshMetrics();
      addToast(`AI analyzed: ${result.incident_category} (${result.severity})`, 'success');
    } catch (err) {
      addToast(`AI analysis failed: ${err.message}`, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRegexAnalyze = async () => {
    setRegexLoading(true);
    setRegexResult(null);
    try {
      const result = await createFallbackIncident({ raw_text: getText(), location_zone: getZone() });
      setRegexResult(result);
      refreshMetrics();
      addToast(`Regex analyzed: ${result.incident_category} (${result.severity})`, 'info');
    } catch (err) {
      addToast(`Regex fallback failed: ${err.message}`, 'error');
    } finally {
      setRegexLoading(false);
    }
  };

  const handleBothAnalyze = async () => {
    setAiResult(null);
    setRegexResult(null);
    setAiLoading(true);
    setRegexLoading(true);
    const text = getText();
    const zone = getZone();

    // Run both in parallel
    const [aiRes, regexRes] = await Promise.allSettled([
      createIncident({ raw_text: text, location_zone: zone }),
      createFallbackIncident({ raw_text: text, location_zone: zone }),
    ]);

    if (aiRes.status === 'fulfilled') {
      setAiResult(aiRes.value);
    } else {
      addToast(`AI failed: ${aiRes.reason.message}`, 'error');
    }
    if (regexRes.status === 'fulfilled') {
      setRegexResult(regexRes.value);
    } else {
      addToast(`Regex failed: ${regexRes.reason.message}`, 'error');
    }

    setAiLoading(false);
    setRegexLoading(false);
    refreshMetrics();
  };

  const handleModelChange = async (model) => {
    try {
      const data = await setModelConfig(model);
      setModelConfigState(data);
      addToast(`Switched to ${data.active_model}`, 'success');
    } catch (err) {
      addToast(`Model switch failed: ${err.message}`, 'error');
    }
  };

  const handleUpgradeToAI = async () => {
    setUpgrading(true);
    try {
      const data = await upgradeAllToAI();
      addToast(data.message, data.upgraded > 0 ? 'success' : 'info');
      refreshMetrics();
    } catch (err) {
      addToast(`Upgrade failed: ${err.message}`, 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const handleToggleOffline = async () => {
    try {
      const data = await toggleOfflineMode();
      setModelConfigState((prev) => prev ? { ...prev, offline_mode: data.offline_mode } : prev);
      addToast(data.offline_mode ? 'Offline mode ON — all analysis uses regex' : 'Offline mode OFF — AI pipeline active', data.offline_mode ? 'info' : 'success');
    } catch (err) {
      addToast(`Toggle failed: ${err.message}`, 'error');
    }
  };

  const ResultCard = ({ title, result, loading, accent }) => (
    <div className={`bg-white rounded-xl border-2 ${accent} p-5 flex-1 min-w-0`}>
      <h3 className="text-sm font-mono font-semibold text-stone uppercase tracking-wider mb-3">{title}</h3>
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-pebble">method:</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              result.analysis_method?.includes('regex') ? 'bg-amber-100 text-amber-700' : 'bg-sage-light text-sage'
            }`}>
              {result.analysis_method}
            </span>
          </div>
          <div>
            <span className="text-xs font-mono text-pebble">category:</span>
            <span className="text-sm font-semibold text-ink ml-2">{result.incident_category}</span>
          </div>
          <div>
            <span className="text-xs font-mono text-pebble">severity:</span>
            <span className={`text-sm font-bold ml-2 ${
              result.severity === 'critical' ? 'text-coral' :
              result.severity === 'high' ? 'text-terracotta' :
              result.severity === 'medium' ? 'text-amber-600' :
              'text-stone'
            }`}>
              {result.severity}
            </span>
          </div>
          <div>
            <span className="text-xs font-mono text-pebble">title:</span>
            <span className="text-sm text-ink ml-2">{result.alert_title}</span>
          </div>
          <div>
            <span className="text-xs font-mono text-pebble">verified:</span>
            <span className="text-sm ml-2">{result.is_verified_incident ? 'Yes' : 'No'}</span>
          </div>
          {result.fake_news_indicators?.length > 0 && (
            <div>
              <span className="text-xs font-mono text-pebble">fake news flags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.fake_news_indicators.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="text-xs font-mono text-pebble">checklist:</span>
            <ol className="mt-1 space-y-1">
              {result.actionable_checklist?.map((step, i) => (
                <li key={i} className="text-sm text-ink flex gap-2">
                  <span className="text-sage font-bold">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="pt-2 border-t border-sand/60">
            <span className="text-xs font-mono text-pebble">{result.incident_id}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-pebble italic">Run analysis to see results</p>
      )}
    </div>
  );

  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-display font-semibold text-ink">AI Fallback Demo</h1>
        <p className="text-stone text-sm mt-0.5">Compare AI (3-tier LLM pipeline) vs Regex (deterministic fallback) side by side</p>
      </div>

      {/* Top row: Model Config + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {/* Model Selector */}
        <div className="bg-white rounded-xl border border-sand/60 p-5 shadow-warm-sm">
          <h2 className="text-sm font-mono font-semibold text-stone uppercase tracking-wider mb-3">Active LLM Model</h2>
          {modelConfig ? (
            <div className="space-y-2">
              {modelConfig.allowed_models.map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    modelConfig.active_model === m ? 'bg-sage-light border border-sage/30' : 'hover:bg-parchment/50 border border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={m}
                    checked={modelConfig.active_model === m}
                    onChange={() => handleModelChange(m)}
                    className="w-4 h-4 text-sage focus:ring-sage border-sand"
                  />
                  <span className={`text-sm font-mono ${modelConfig.active_model === m ? 'text-sage font-medium' : 'text-ink'}`}>
                    {m}
                  </span>
                  {modelConfig.active_model === m && (
                    <span className="text-xs bg-sage text-white px-2 py-0.5 rounded-full ml-auto">Active</span>
                  )}
                </label>
              ))}
              <p className="text-xs text-pebble mt-2">Tier 1 tries active model. If it fails, Tier 2 tries the other. If both fail, Tier 3 regex kicks in.</p>

              {/* Offline Mode Toggle */}
              <div className="mt-3 pt-3 border-t border-sand/60">
                <button
                  onClick={handleToggleOffline}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    modelConfig.offline_mode
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-parchment/50 border border-sand/60 hover:bg-sand-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{modelConfig.offline_mode ? '📡' : '🌐'}</span>
                    <div className="text-left">
                      <span className={`text-sm font-medium ${modelConfig.offline_mode ? 'text-amber-700' : 'text-ink'}`}>
                        Offline Mode
                      </span>
                      <p className="text-xs text-pebble">
                        {modelConfig.offline_mode ? 'AI disabled — regex only' : 'AI pipeline active'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-colors ${modelConfig.offline_mode ? 'bg-amber-400' : 'bg-sand'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${modelConfig.offline_mode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="skeleton h-24" />
          )}
        </div>

        {/* Metrics */}
        <div className="bg-white rounded-xl border border-sand/60 p-5 shadow-warm-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono font-semibold text-stone uppercase tracking-wider">All Incidents</h2>
            <button onClick={refreshMetrics} className="text-xs text-sage hover:text-sage-dark font-medium transition-colors">Refresh</button>
          </div>
          {metrics ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-sage-light rounded-lg">
                  <div className="text-2xl font-mono font-bold text-sage">{metrics.ai_success_count}</div>
                  <div className="text-xs text-stone font-mono mt-0.5">AI</div>
                </div>
                <div className="text-center p-3 bg-terracotta-light rounded-lg">
                  <div className="text-2xl font-mono font-bold text-terracotta">{metrics.regex_fallback_count}</div>
                  <div className="text-xs text-stone font-mono mt-0.5">Regex</div>
                </div>
                <div className="text-center p-3 bg-purple-light rounded-lg">
                  <div className="text-2xl font-mono font-bold text-purple">{metrics.total_analyzed}</div>
                  <div className="text-xs text-stone font-mono mt-0.5">Total</div>
                </div>
              </div>
              {metrics.regex_fallback_count > 0 && !modelConfig?.offline_mode && (
                <button
                  onClick={handleUpgradeToAI}
                  disabled={upgrading}
                  className="w-full mt-3 px-4 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-warm-sm"
                >
                  {upgrading ? 'Upgrading...' : `Upgrade ${metrics.regex_fallback_count} Regex → AI`}
                </button>
              )}
            </div>
          ) : (
            <div className="skeleton h-24" />
          )}
        </div>
      </div>

      {/* Scenario Picker */}
      <div className="bg-white rounded-xl border border-sand/60 p-5 shadow-warm-sm mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-sm font-mono font-semibold text-stone uppercase tracking-wider mb-3">Test Scenario</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {DEMO_SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setSelectedScenario(i); setCustomText(''); setAiResult(null); setRegexResult(null); }}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                !customText && selectedScenario === i
                  ? 'bg-sage text-white'
                  : 'bg-parchment text-stone border border-sand/60 hover:bg-sand-light'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input text */}
        <div className="bg-parchment/50 rounded-lg p-4 border border-sand/60 mb-4">
          <textarea
            value={customText || DEMO_SCENARIOS[selectedScenario].text}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            className="w-full bg-transparent text-sm text-ink placeholder-pebble resize-none focus:outline-none"
            placeholder="Type custom text or pick a scenario above..."
            aria-label="Incident text to analyze"
          />
          {customText && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-sand/60">
              <label className="text-xs text-stone font-mono">Zone:</label>
              <select
                value={customZone}
                onChange={(e) => setCustomZone(e.target.value)}
                className="text-xs px-2 py-1 bg-white border border-sand rounded-lg text-ink"
                aria-label="Select zone"
              >
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBothAnalyze}
            disabled={aiLoading || regexLoading}
            className="px-6 py-3 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-warm-sm"
          >
            {aiLoading || regexLoading ? 'Analyzing...' : 'Compare: AI vs Regex'}
          </button>
          <button
            onClick={handleAiAnalyze}
            disabled={aiLoading}
            className="px-5 py-3 bg-white border border-sage text-sage text-sm font-medium rounded-xl hover:bg-sage-light transition-colors disabled:opacity-50"
          >
            {aiLoading ? 'Running...' : 'AI Only'}
          </button>
          <button
            onClick={handleRegexAnalyze}
            disabled={regexLoading}
            className="px-5 py-3 bg-white border border-terracotta text-terracotta text-sm font-medium rounded-xl hover:bg-terracotta-light transition-colors disabled:opacity-50"
          >
            {regexLoading ? 'Running...' : 'Regex Only'}
          </button>
        </div>
      </div>

      {/* Side-by-side Results */}
      {(aiResult || regexResult || aiLoading || regexLoading) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up">
          <ResultCard title="AI Pipeline (LLM)" result={aiResult} loading={aiLoading} accent="border-sage" />
          <ResultCard title="Regex Fallback" result={regexResult} loading={regexLoading} accent="border-terracotta" />
        </div>
      )}
    </div>
  );
}
