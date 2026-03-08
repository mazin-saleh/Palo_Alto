import { useState } from 'react';
import { CATEGORIES, SEVERITIES, ZONES } from '../utils/constants';

export default function SearchFilter({ filters, onChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const update = (key, value) => onChange({ ...filters, [key]: value });

  const activeCount = [filters.category, filters.severity, filters.zone].filter(Boolean).length
    + (filters.verified !== null ? 1 : 0)
    + (filters.status ? 1 : 0);

  return (
    <div className="mb-6 space-y-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      {/* Search bar + filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pebble pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search reports..."
            value={filters.search || ''}
            onChange={(e) => update('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-sand rounded-xl text-ink placeholder-pebble focus:outline-none focus:border-sage text-sm transition-colors"
            aria-label="Search reports"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            showFilters || activeCount > 0
              ? 'bg-sage-light border-sage/30 text-sage'
              : 'bg-white border-sand text-stone hover:bg-parchment'
          }`}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter{activeCount > 0 && ` (${activeCount})`}
        </button>
      </div>

      {/* Filter dropdown */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-sand/60 shadow-warm-sm p-4 space-y-3 animate-fade-in-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone mb-1">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => update('category', e.target.value)}
                aria-label="Filter by category"
                className="w-full px-3 py-2 bg-parchment/50 border border-sand rounded-lg text-ink text-sm focus:outline-none focus:border-sage transition-colors"
              >
                <option value="">All</option>
                {CATEGORIES.filter(c => c !== 'Noise').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone mb-1">Urgency</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => update('severity', e.target.value)}
                aria-label="Filter by urgency"
                className="w-full px-3 py-2 bg-parchment/50 border border-sand rounded-lg text-ink text-sm focus:outline-none focus:border-sage transition-colors"
              >
                <option value="">All</option>
                {SEVERITIES.filter(s => s !== 'noise').map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone mb-1">Zone</label>
              <select
                value={filters.zone || ''}
                onChange={(e) => update('zone', e.target.value)}
                aria-label="Filter by zone"
                className="w-full px-3 py-2 bg-parchment/50 border border-sand rounded-lg text-ink text-sm focus:outline-none focus:border-sage transition-colors"
              >
                <option value="">All Zones</option>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => update('status', e.target.value)}
                aria-label="Filter by status"
                className="w-full px-3 py-2 bg-parchment/50 border border-sand rounded-lg text-ink text-sm focus:outline-none focus:border-sage transition-colors"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
          {activeCount > 0 && (
            <button
              onClick={() => onChange({ search: filters.search, category: '', severity: '', verified: null, zone: '', status: '' })}
              className="text-xs text-pebble hover:text-ink transition-colors underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
