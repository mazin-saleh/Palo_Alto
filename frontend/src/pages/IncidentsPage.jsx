import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchIncidents } from '../api';
import IncidentCard from '../components/IncidentCard';
import IncidentDetail from '../components/IncidentDetail';
import IncidentForm from '../components/IncidentForm';
import SearchFilter from '../components/SearchFilter';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '', severity: '', verified: null, zone: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const location = useLocation();

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { hide_noise: true };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.severity) params.severity = filters.severity;
      if (filters.verified !== null) params.verified = filters.verified;
      if (filters.zone) params.zone = filters.zone;
      if (filters.status) params.status = filters.status;
      const data = await fetchIncidents(params);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Handle navigation state (from dashboard/banner clicks)
  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.openForm) {
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.key]);

  // Open selected incident once data is loaded
  useEffect(() => {
    const state = location.state;
    if (!state?.selectedId || incidents.length === 0) return;
    const found = incidents.find((i) => i.incident_id === state.selectedId);
    if (found) {
      setSelectedIncident(found);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, incidents]);

  const handleIncidentUpdated = (updated) => {
    setSelectedIncident(updated);
    setIncidents((prev) =>
      prev.map((inc) => (inc.incident_id === updated.incident_id ? updated : inc))
    );
  };

  // Close slide-over on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedIncident) setSelectedIncident(null);
        else if (showForm) setShowForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIncident, showForm]);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">All Reports</h1>
          <p className="text-stone text-sm mt-0.5">
            {incidents.length} report{incidents.length !== 1 ? 's' : ''} in your area
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-warm-sm hover:shadow-warm active:scale-[0.98]"
          aria-label="Report a safety concern"
        >
          Report
        </button>
      </div>

      {/* Filters */}
      <SearchFilter filters={filters} onChange={setFilters} />

      {/* Incident List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-20 animate-fade-in-up">
          <svg viewBox="0 0 40 44" className="w-14 h-14 text-sage/30 mx-auto mb-4" aria-hidden="true">
            <path d="M20 3L5 10.5v9.5c0 9.5 6.4 18.4 15 21 8.6-2.6 15-11.5 15-21v-9.5L20 3z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 22l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <p className="text-stone text-lg mb-1">No reports found</p>
          <p className="text-pebble">Submit a report or adjust your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc, i) => (
            <IncidentCard
              key={inc.incident_id}
              incident={inc}
              onClick={setSelectedIncident}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Slide-over Detail Panel */}
      <IncidentDetail
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={handleIncidentUpdated}
      />

      {/* Slide-over Form Panel */}
      {showForm && (
        <div
          className="fixed inset-0 slide-over-backdrop z-50"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Report a safety concern"
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-lg bg-ivory overflow-y-auto animate-slide-in-right shadow-warm-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand/60 sticky top-0 bg-ivory/95 backdrop-blur-sm z-10">
              <h2 className="text-lg font-display font-semibold text-ink">Report a Concern</h2>
              <button
                onClick={() => setShowForm(false)}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-stone hover:bg-parchment hover:text-ink transition-colors"
                aria-label="Close form"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <IncidentForm
                onCreated={() => {
                  loadIncidents();
                  setShowForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
