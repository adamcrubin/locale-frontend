import { useState, useEffect, useRef } from 'react';
import { DC_NEIGHBORHOODS } from '../data/neighborhoods';

const AREA_ORDER = ['DC', 'Arlington', 'Alexandria', 'NoVA', 'Maryland'];
const AREA_LABELS = {
  DC: 'DC Proper',
  Arlington: 'Arlington',
  Alexandria: 'Alexandria',
  NoVA: 'Northern Virginia',
  Maryland: 'Maryland',
};

function groupByArea(list) {
  const groups = {};
  for (const n of list) {
    if (!groups[n.area]) groups[n.area] = [];
    groups[n.area].push(n);
  }
  return groups;
}

export default function NeighborhoodPicker({ onSelect, onClose, current }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = query.trim()
    ? DC_NEIGHBORHOODS.filter(n =>
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        n.area.toLowerCase().includes(query.toLowerCase()) ||
        n.zip.includes(query)
      )
    : DC_NEIGHBORHOODS;

  const groups = groupByArea(filtered);

  const handleSelect = (neighborhood) => {
    onSelect(neighborhood);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.6)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FDFCFA',
          borderRadius: 14,
          width: '100%',
          maxWidth: 440,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,.35)',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 18px 12px',
          borderBottom: '1px solid rgba(0,0,0,.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1C1A17' }}>
              Choose your neighborhood
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: '#9B9590', lineHeight: 1, padding: '2px 4px',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: '#B0AAA5', pointerEvents: 'none',
            }}>
              ⌕
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search neighborhoods..."
              style={{
                width: '100%',
                padding: '8px 10px 8px 30px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,.12)',
                fontSize: 13,
                background: '#F5F3F0',
                color: '#1C1A17',
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {AREA_ORDER.filter(a => groups[a]?.length).map(area => (
            <div key={area}>
              {/* Area header */}
              <div style={{
                padding: '8px 18px 4px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#B0AAA5',
              }}>
                {AREA_LABELS[area]}
              </div>

              {/* Neighborhoods */}
              {groups[area].map(n => {
                const isSelected = n.label === current;
                return (
                  <button
                    key={n.label}
                    onClick={() => handleSelect(n)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '9px 18px',
                      background: isSelected ? 'rgba(201,168,76,.08)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      textAlign: 'left',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,.04)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isSelected ? 'rgba(201,168,76,.08)' : 'transparent';
                    }}
                  >
                    <span style={{
                      fontSize: 13,
                      color: isSelected ? '#8B6914' : '#1C1A17',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {n.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#B0AAA5' }}>{n.zip}</span>
                      {isSelected && (
                        <span style={{ fontSize: 13, color: '#C9A84C' }}>✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{
              padding: '32px 18px',
              textAlign: 'center',
              fontSize: 13,
              color: '#B0AAA5',
            }}>
              No neighborhoods match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid rgba(0,0,0,.07)',
          fontSize: 11,
          color: '#B0AAA5',
          flexShrink: 0,
        }}>
          Sets your home area for distance-based sorting
        </div>
      </div>
    </div>
  );
}
