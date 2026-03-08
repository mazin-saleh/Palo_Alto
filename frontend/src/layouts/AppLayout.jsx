import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import TextToSpeech from '../components/TextToSpeech';
import { fetchDigest } from '../api';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [criticalCount, setCriticalCount] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();

  const pollDigest = useCallback(async () => {
    try {
      const digest = await fetchDigest();
      const alerts = digest.active_alerts || [];
      const criticals = alerts.filter((a) => a.severity === 'critical');
      const highs = alerts.filter((a) => a.severity === 'high');
      setCriticalCount(criticals.length);

      const pickTop = (list) =>
        list.slice(0, 2).map((a) => ({
          title: a.alert_title || a.incident_category,
          zone: a.location_zone,
          severity: a.severity,
          incident_id: a.incident_id,
        }));

      if (criticals.length > 0) {
        setCriticalAlerts(pickTop(criticals));
      } else if (highs.length > 0) {
        setCriticalAlerts(pickTop(highs));
      } else {
        setCriticalAlerts([]);
        setBannerDismissed(false);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    pollDigest();
    const interval = setInterval(pollDigest, 60000);
    return () => clearInterval(interval);
  }, [pollDigest]);

  useEffect(() => {
    const handleKey = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.target.isContentEditable) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowShortcuts((s) => !s);
          break;
        case 'h':
          navigate('/');
          break;
        case 'a':
          navigate('/analytics');
          break;
        case 'r':
          navigate('/incidents', { state: { openForm: true } });
          break;
        case '/':
          e.preventDefault();
          navigate('/incidents');
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ivory">
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} criticalCount={criticalCount} />
      {criticalAlerts.length > 0 && !bannerDismissed && (() => {
        const isCritical = criticalAlerts[0].severity === 'critical';
        const bannerBg = isCritical ? 'bg-coral' : 'bg-amber-500';
        const label = isCritical ? 'CRITICAL' : 'HIGH';
        const alertText = criticalAlerts
          .map((a) => `${a.title}${a.zone ? ` (${a.zone})` : ''}`)
          .join(' — ');
        return (
          <div
            role="alert"
            aria-live="assertive"
            className={`${bannerBg} text-white px-4 py-2.5 flex items-center gap-3 text-sm transition-all duration-300 ${collapsed ? 'md:ml-[68px]' : 'md:ml-[220px]'}`}
          >
            <span
              className="relative flex h-2.5 w-2.5 shrink-0"
              aria-hidden="true"
            >
              {isCritical && (
                <span
                  className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75"
                  style={{ animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                />
              )}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span className="font-semibold tracking-wide">{label}</span>
            <span className="truncate">{alertText}</span>
            <button
              onClick={() => navigate('/incidents', { state: { selectedId: criticalAlerts[0]?.incident_id } })}
              className="ml-auto shrink-0 rounded bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-medium transition-colors"
            >
              View Details
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 rounded hover:bg-white/20 p-1 transition-colors"
              aria-label="Dismiss alert banner"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        );
      })()}
      <main
        id="main-content"
        className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 ${collapsed ? 'md:ml-[68px]' : 'md:ml-[220px]'}`}
      >
        <Outlet />
      </main>
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TextToSpeech />
    </div>
  );
}
