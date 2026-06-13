import { useState, useEffect, useRef, useCallback } from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExploreIcon from '@mui/icons-material/Explore';
import CloseIcon from '@mui/icons-material/Close';
import { catalogService, LocationDto } from '../../services/catalog.service';

export type LocationKind = 'location' | 'space_marker';

export interface LocationValue {
  kind: LocationKind;
  locationId?: string;
  locationName: string;
}

interface LocationPickerProps {
  label: string;
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export function LocationPicker({ label, value, onChange }: LocationPickerProps) {
  const [query, setQuery]       = useState(value.kind === 'location' ? value.locationName : '');
  const [results, setResults]   = useState<LocationDto[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debouncedQuery          = useDebounce(query, 300);
  const wrapRef                 = useRef<HTMLDivElement>(null);

  // sync query when value is set externally (e.g. edit mode)
  useEffect(() => {
    if (value.kind === 'location') setQuery(value.locationName);
  }, [value.locationName, value.kind]);

  useEffect(() => {
    if (value.kind !== 'location') return;
    if (debouncedQuery.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    catalogService.getLocations(debouncedQuery)
      .then((locs) => { setResults(locs); setOpen(locs.length > 0); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, value.kind]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectLocation = useCallback((loc: LocationDto) => {
    onChange({ kind: 'location', locationId: loc.id, locationName: loc.name });
    setQuery(loc.name);
    setOpen(false);
  }, [onChange]);

  const clearLocation = useCallback(() => {
    onChange({ kind: 'location', locationId: undefined, locationName: '' });
    setQuery('');
    setResults([]);
  }, [onChange]);

  const switchKind = useCallback((kind: LocationKind) => {
    onChange({ kind, locationId: undefined, locationName: '' });
    setQuery('');
    setResults([]);
    setOpen(false);
  }, [onChange]);

  return (
    <div className="lp-wrap" ref={wrapRef}>
      <label className="field-label">{label}</label>

      {/* kind toggle */}
      <div className="lp-kind-toggle">
        <button
          type="button"
          className={'lp-kind-btn' + (value.kind === 'location' ? ' active' : '')}
          onClick={() => switchKind('location')}
        >
          <LocationOnIcon style={{ width: 13, height: 13 }} /> Station / Location
        </button>
        <button
          type="button"
          className={'lp-kind-btn' + (value.kind === 'space_marker' ? ' active' : '')}
          onClick={() => switchKind('space_marker')}
        >
          <ExploreIcon style={{ width: 13, height: 13 }} /> Space Marker
        </button>
      </div>

      {value.kind === 'location' ? (
        <div className="lp-input-wrap">
          <input
            className="field-input"
            type="text"
            placeholder="Search stations & locations…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // if user edits after selection, clear the resolved id
              if (value.locationId) onChange({ kind: 'location', locationId: undefined, locationName: e.target.value });
            }}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            autoComplete="off"
          />
          {(query || value.locationId) && (
            <button type="button" className="lp-clear" onClick={clearLocation} aria-label="Clear">
              <CloseIcon style={{ width: 14, height: 14 }} />
            </button>
          )}
          {loading && <span className="lp-spinner" />}
          {open && results.length > 0 && (
            <ul className="lp-dropdown">
              {results.map((loc) => (
                <li
                  key={loc.id}
                  className={'lp-option' + (loc.id === value.locationId ? ' selected' : '')}
                  onMouseDown={(e) => { e.preventDefault(); selectLocation(loc); }}
                >
                  <span className="lp-opt-name">{loc.name}</span>
                  {loc.starSystemName && <span className="lp-opt-system">{loc.starSystemName}</span>}
                </li>
              ))}
            </ul>
          )}
          {!loading && query.length >= 3 && results.length === 0 && open === false && (
            <p className="lp-no-results">No locations found for "{query}"</p>
          )}
          {value.locationId && (
            <p className="lp-resolved">
              <LocationOnIcon style={{ width: 11, height: 11 }} />
              {value.locationName}
            </p>
          )}
        </div>
      ) : (
        <div className="lp-input-wrap">
          <input
            className="field-input"
            type="text"
            placeholder="Describe position, e.g. 'Near Yela L4 point'"
            value={value.locationName}
            onChange={(e) => onChange({ kind: 'space_marker', locationName: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
