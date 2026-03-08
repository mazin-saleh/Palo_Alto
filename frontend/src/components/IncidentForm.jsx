import { useState } from 'react';
import { createIncident } from '../api';
import { useToast } from './Toast';
import { ZONES, ZONE_LABELS } from '../utils/constants';

const CATEGORY_HINTS = [
  { label: 'Phishing', template: 'I received a suspicious email/text message that appears to be a phishing attempt. ' },
  { label: 'Scam', template: 'I encountered a potential scam involving ' },
  { label: 'Suspicious Activity', template: 'I noticed suspicious activity in my area: ' },
  { label: 'Physical Hazard', template: 'There is a physical hazard that needs attention: ' },
  { label: 'Infrastructure', template: 'I want to report an infrastructure issue: ' },
];

export default function IncidentForm({ onCreated }) {
  const [rawText, setRawText] = useState('');
  const [zone, setZone] = useState('Sector 1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const addToast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rawText.length < 10) {
      setError('Please provide a bit more detail (at least 10 characters).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createIncident({
        raw_text: rawText,
        location_zone: zone,
      });
      setRawText('');
      setSuccess(true);
      addToast('Report submitted — thank you!', 'success');
      setTimeout(() => {
        setSuccess(false);
        onCreated();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage-light flex items-center justify-center">
          <svg className="w-8 h-8 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-display font-semibold text-ink mb-2">Thank you!</h3>
        <p className="text-stone text-sm">We'll review this and alert the community if needed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-2">
        <h3 className="text-lg font-display font-semibold text-ink">Report a Safety Concern</h3>
        <p className="text-stone text-sm mt-0.5">Your report helps keep the community informed</p>
      </div>

      {/* Category hint pills */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Quick start</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_HINTS.map((hint) => (
            <button
              key={hint.label}
              type="button"
              onClick={() => setRawText(hint.template + rawText)}
              aria-label={`Use "${hint.label}" template`}
              className="text-xs px-3 py-1.5 bg-parchment border border-sand rounded-full text-stone hover:bg-sage-light hover:text-sage hover:border-sage/30 transition-colors"
            >
              {hint.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="incident-text">What did you see or experience?</label>
        <textarea
          id="incident-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Describe it in your own words..."
          rows={5}
          maxLength={2000}
          className="w-full px-4 py-3 bg-parchment/50 border border-sand rounded-xl text-ink placeholder-pebble focus:outline-none focus:border-sage focus:bg-white resize-none text-base transition-colors"
          aria-describedby="char-count"
        />
        <div id="char-count" className="text-xs text-pebble text-right mt-1">{rawText.length}/2000</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="zone-select">Where did this happen?</label>
        <select
          id="zone-select"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="w-full px-3 py-2.5 bg-parchment/50 border border-sand rounded-xl text-ink focus:outline-none focus:border-sage text-base transition-colors"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>{z} — {ZONE_LABELS[z]}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-coral text-sm font-medium" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-sage hover:bg-sage-dark text-white text-base font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-warm-sm hover:shadow-warm active:scale-[0.98]"
      >
        {loading ? 'Sending...' : 'Send Report'}
      </button>
    </form>
  );
}
